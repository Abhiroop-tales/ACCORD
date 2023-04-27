from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_mysqldb import MySQL
import yaml, hashlib, os, time, random
from math import floor
from functools import wraps
from serviceAPI import create_user_driveAPI_service, create_directoryAPI_service, create_reportsAPI_service
from detection import get_filteroptions
from conflictDetctionAlgorithm import detectmain
from sqlconnector import DatabaseQuery
from activitylogs import Logupdater
from simulator import PerformActions

# Dictionary to store the user services
user_services = {}

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Load database configuration
db_config = yaml.load(open('db.yaml'), Loader=yaml.SafeLoader)
app.config['MYSQL_HOST'] = db_config['mysql_host']
app.config['MYSQL_USER'] = db_config['mysql_user']
app.config['MYSQL_PASSWORD'] = db_config['mysql_password']
app.config['MYSQL_DB'] = db_config['mysql_db']

mysql = MySQL(app)



## Route to ensure there is no going back and cache is cleared ###########################
@app.after_request
def add_no_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "-1"
    return response


@app.before_request
def before_request():
    if 'user_id' in session:
        if request.endpoint in ['login']:
            if session['user_role'] == 'admin':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('user_dashboard'))


########### Route to Log In the user######################
@app.route('/', methods=['GET', 'POST'])
def login():
    session.clear()
    error = None
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        password = hashlib.md5(password.encode())

        cursor = mysql.connection.cursor()
        cursor.execute("SELECT email,password,role FROM app_users WHERE email=%s AND password=%s", (email, password.hexdigest()))
        user = cursor.fetchone()

        if user:
            session['user_id'] = user[0]
            session['user_role'] = user[2]
            session['username'] = user[0].split('@')[0]  # Store the username in the session

            # Create the drive API and directory API service after a successful login
            drive_service = create_user_driveAPI_service(session['username'])
            directory_service = create_directoryAPI_service()
            reportsAPI_service = create_reportsAPI_service()

            # Store services in the global services dictionary
            user_services[session['username']] = {'drive': drive_service, 'directory': directory_service, 'reports': reportsAPI_service}

            # Fetch and Update the logs database
            activity_logs = Logupdater(mysql, user_services[session['username']]['reports'])
            activity_logs.updateLogs_database() 
            del activity_logs


            if session['user_role'] == 'admin':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('user_dashboard'))
        else:
            error = "Invalid email or password."

    return render_template('index.html', error=error)


##### Routes for user and Admin Dashboards ##############
@app.route('/admin_dashboard')
def admin_dashboard():
    if 'user_id' in session and session['user_role'] == 'admin':

        drive_service = user_services[session['username']]['drive']
        directory_service = user_services[session['username']]['directory']

        options_actor, options_document = get_filteroptions(drive_service, directory_service)
        session['user_documents'] = options_document

        return render_template('dashboard.html', user_role='admin', username=session['username'], options_actor=options_actor, options_document=options_document)
    else:
        return redirect(url_for('login'))

@app.route('/user_dashboard')
def user_dashboard():
    if 'user_id' in session and session['user_role'] != 'admin':

        drive_service = user_services[session['username']]['drive']
        directory_service = user_services[session['username']]['directory']
        options_actor, options_document = get_filteroptions(drive_service, directory_service)
        session['user_documents'] = options_document

        return render_template('dashboard.html', user_role='user', username=session['username'], options_actor=options_actor, options_document=options_document)
    else:
        return redirect(url_for('login'))



####### Route for Log Out #############
@app.route('/logout')
def logout():
    # Remove services from the global services dictionary upon logout
    if 'username' in session:
        user_services.pop(session['username'], None)

    session.clear()
    flash('You have been logged out.', 'success')
    return redirect(url_for('login'))

############# Route to handle Regresh Logs event ################
@app.route('/refresh_logs', methods=['POST'])
def refresh_logs():
    # Fetch and Update the logs database
    activity_logs = Logupdater(mysql, user_services[session['username']]['reports'])
    total_logs = activity_logs.updateLogs_database() 
    del activity_logs
    
    return jsonify(len=str(total_logs))

########### Route to handle OnClick Detect Function ##############
@app.route('/detect_conflicts', methods=['POST'])
def detect_conflicts():
    action = request.form.get('action')
    actor = request.form.get('actor')
    document = request.form.get('document')

    if(action == "Any"):
        action = "LIKE '%'"
    else:
        action = "LIKE '"+action+"%'"
    if(actor == "Any"):
        actor = "LIKE '%'"
    else:
        actor = "= '"+actor+"'"
    if(document == "Any"):
        document = "LIKE '%'"
    else:
        document = "= '"+document+"'" 

    # Extract Logs from databse with the filter parameters and also extract all the action constraints
    db = DatabaseQuery(mysql.connection, mysql.connection.cursor())
    logs = db.extract_logs_detect(action,actor,document)
    actionConstraintsList = db.extract_action_constraints("LIKE '%'")
    del db

    # Create a Dictionary of action constraitns with key as documentID
    actionConstraints = {}
    for constraint in actionConstraintsList:
        if(constraint[1] not in actionConstraints):
            actionConstraints[constraint[1]] = [constraint]
        else:
            actionConstraints[constraint[1]].append(constraint)
    
    if(logs != None and len(logs)>1):
        
        # Initializing and setting user view parameters
        headers = logs.pop(0)
        conflictLogs = []
        logs = logs[::-1]

        # Only use user Logs that are part of user documents
        if(session['user_role'] != "admin" and document == "LIKE '%'"):
            print("Hello")
            userLogs = []
            for log in logs:
                docName = log[3]
                if docName in session['user_documents']:
                    userLogs.append(log)
            
            logs = userLogs


        # Calculate time taken by the detection Engine to detect conflicts
        T0 = time.time()
        result = detectmain(logs,actionConstraints)
        T1 = time.time()

        # Update the display table only with Conflicts and print the detection Time
        totalLogs = len(result)
        conflictsCount = 0

        for i in range(totalLogs):
            # Extract only the logs that have conflict
            if(result[i]):
                event = logs[i]
                conflictLogs.append([event[0],event[1].split(':')[0].split('-')[0],event[3],event[5]])
                conflictsCount += 1

        if(T1 == T0):
            speed = "Inf"
        else:
            speed = floor(conflictsCount/(T1-T0))
        
        detectTimeLabel = "Time taken to detect "+str(conflictsCount)+" conflicts from "+str(totalLogs)+" activity logs: "+str(round(T1-T0,3))+" seconds. Speed = "+str(speed)+" conflicts/sec"

        
 
        return jsonify(logs=conflictLogs, detectTimeLabel=detectTimeLabel)
    
    else:
        detectTimeLabel = "No Activites Found for the selected filters"
        return jsonify(logs=[], detectTimeLabel=detectTimeLabel)
        

## Route to Simulate actions for user study
@app.route('/fetch_task_content/<task_id>')
def fetch_task_content(task_id):
    # Fetch the content for the task based on the task_id
    # Initilize Actions, Actions to be simulated and Delays 
    actionsList = ["Create", "Delete", "Edit", "Move", "Permission Change"]
    actionsCount = 3
    delayCount = 3
    

    if task_id == 'task1':
        actionSimulationList = ['Create', 'Permission Change', 'Permission Change']
        addConstraint = "Permission Change"
        story = """<p>In a busy workspace, you and your team collaborate smoothly using Google Drive Cloud. 
        Everything is usually efficient and trouble-free. However, one day, something peculiar occurs. 
        The file access permissions become jumbled, leading to confusion about who can view or modify specific documents.</p>
        <p>Some teammates lose access to vital files, while others can see things they shouldn't.
        Just when the chaos begins to escalate, a helpful application comes to your rescue. Your task is to use this app to investigate the issue, comprehend its origin, and implement the suggested solutions to rectify the problems.</p>
        <p>As you undertake your mission, the application efficiently restores order, ensuring each team member has the appropriate access to the files they need. 
        With normalcy restored, it's time to reflect on the experience.</p> 
        <p>Share your thoughts about the app's proposed solutions and their effectiveness, helping to improve the application and maintain smooth collaboration for everyone in the future.</p>"""


    elif task_id == 'task2':
        actionSimulationList = ['Create',  'Permission Change', 'Move']
        addConstraint = "Move"
    elif task_id == 'task3':
        actionSimulationList = ['Create', 'Permission Change', 'Edit']
        addConstraint = "Edit"
    elif task_id == 'task4':
        actionSimulationList = ['Create', 'Permission Change', 'Delete']
        addConstraint = "Delete"
    else:
        actionSimulationList = ['Create', 'Create', 'Permission Change']
        addConstraint = "Create"



    delayList = [random.randint(1, delayCount) for i in range(actionsCount)]

    #### CallSimulator Object #########
    # Extract User tokes 
    directory = "tokens/"
    file_dict = {}

    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            key = filename.split("_")[1].split(".")[0]+'@abhiroop.shop'
            file_dict[key] = filename

    Simulator = PerformActions(actionsCount, actionSimulationList, delayList, addConstraint, mysql)
    Simulator.perform_actions(file_dict)
   
    
    
    
    # Return the task content as an HTML string
    return story
        




if __name__ == '__main__':
    app.run(debug=True)
