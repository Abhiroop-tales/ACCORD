from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_mysqldb import MySQL
import yaml, hashlib, os, time, random
from datetime import datetime
from math import floor
from functools import wraps
from serviceAPI import create_user_driveAPI_service, create_directoryAPI_service, create_reportsAPI_service
from detection import get_filteroptions
from conflictDetctionAlgorithm import detectmain
from sqlconnector import DatabaseQuery
from activitylogs import Logupdater
from demosimulator import UserSubject, PerformActions
from logextraction import extractDriveLog


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

############# Route to handle Refresh Logs event ################
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
    # Fetch and Update the logs database
    activity_logs = Logupdater(mysql, user_services[session['username']]['reports'])
    total_logs = activity_logs.updateLogs_database() 
    del activity_logs

    action = request.form.get('action')
    actor = request.form.get('actor')
    document = request.form.get('document')
    currentDateTime = request.form.get('current_date')
    

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
            
            userLogs = []
            for log in logs:
                activityTime = log[0]
                docName = log[3]
                #if docName in session['user_documents'] and activityTime>= currentDateTime:
                if activityTime>= currentDateTime:
                    userLogs.append(log)
            
            logs = userLogs

        print(currentDateTime)
        # Calculate time taken by the detection Engine to detect conflicts
        T0 = time.time()
        result = detectmain(logs,actionConstraints)
        T1 = time.time()

        # Update the display table only with Conflicts and print the detection Time
        totalLogs = len(result)
        conflictsCount = 0
        briefLogs = []
        for i in range(totalLogs):
            # Extract only the logs that have conflict
            if(result[i]):
                event = logs[i]
                conflictLogs.append([event[0],event[1].split(':')[0].split('-')[0],event[3],event[5]])
                briefLogs.append(event)
                conflictsCount += 1

        if(T1 == T0):
            speed = "Inf"
        else:
            speed = floor(conflictsCount/(T1-T0))
        
        detectTimeLabel = "Time taken to detect "+str(conflictsCount)+" conflicts from "+str(totalLogs)+" activity logs: "+str(round(T1-T0,3))+" seconds. Speed = "+str(speed)+" conflicts/sec"

        
 
        return jsonify(logs=conflictLogs, detectTimeLabel=detectTimeLabel, briefLogs=briefLogs)
    
    else:
        detectTimeLabel = "No Activites Found for the selected filters"
        return jsonify(logs=[], detectTimeLabel=detectTimeLabel, briefLogs=[])
        

## Route to Simulate actions for user study
@app.route('/fetch_task_content', methods=['POST'])
def fetch_task_content():
    

    # Fetch the content for the task based on the task_id
    # Initilize Actions, Actions to be simulated and Delays 
    #actionsList = ["Create", "Delete", "Edit", "Move", "Permission Change"]
    
    # Extract JSON data from POST request
    data = request.get_json()

    action = data['action']
    addConstraint = data['addConstraint']
    constraintType = data['constraintType']
    fileID = data['fileID']
    actionIndex = int(data['actionIndex'])
    print(actionIndex)
    if(fileID == 'None'):
        fileID = None
    
    

    #### CallSimulator Object #########
    # Extract User tokes 
    directory = "tokens/"
    #file_dict = {'abt@abhiroop.shop':'token_abt.json','abhi09@abhiroop.shop':'token_abhi09.json','actor@abhiroop.shop':'token_actor.json','actor2@abhiroop.shop':'token_actor2.json'}
    file_dict = {}
    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            key = filename.split("_")[1].split(".")[0]+'@abhiroop.shop'
            file_dict[key] = filename

    ### Perform first few actions as owner and remainer other actions as other ditors
    owner = UserSubject(session['user_id'], file_dict)
    if(actionIndex < 2):
        actor = owner
    else:
        # get all the editors of the file
        file = owner.service.files().get(fileId=fileID, fields="permissions").execute()
        email_list = []  # Create an empty list to store the emails
        for permission in file['permissions']:
            if permission.get('role') in ['writer', 'owner']:
                email_list.append(permission.get('emailAddress'))  # Add email to the list if user has 'writer' or 'owner' permission
        
        # Remove the owner's email from the list if it exists
        if owner.userEmail in email_list:
            email_list.remove(owner.userEmail)
     
        # Select a random email from the list
        actorEmail = random.choice(email_list) if email_list else owner.userEmail
        actor = UserSubject(actorEmail, file_dict)

    # Add Constraint and Perform the constraint action 
    if(actionIndex == 3):
        db = DatabaseQuery(mysql.connection, mysql.connection.cursor())
        file = owner.service.files().get(fileId=fileID, fields='name').execute()
        document_name = file['name']
        
        if(action == "Edit" and constraintType == "Time Limit Edit"):
            current_datetime = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            constraints = [document_name, fileID, action, constraintType, actor.userEmail, "TRUE", "lt",owner.userEmail, current_datetime]
        else:
            constraints = [document_name, fileID, action, constraintType, actor.userEmail, "FALSE", "eq", owner.userEmail, '-']
        db.add_action_constraint(constraints)
        time.sleep(3)

        
    
    Simulator = PerformActions(owner, actor, action, constraintType, fileID, actionIndex)
    fileID = Simulator.perform_actions(file_dict)

    # Sleep to Fetch and Update the logs database
    time.sleep(5)

    # Return the file ID content as an HTML string
    return fileID
        
############## Route to fetch Drive Log ##########################
@app.route('/fetch_drive_log', methods=['GET'])
def fetch_drive_log():
    time = request.args.get('time') # retrieve time from the GET parameters
    # Create DB connection
    db = DatabaseQuery(mysql.connection, mysql.connection.cursor())

    totalLogs = []
    
    if(time != None):
        # Extract the activity logs from the Google cloud from lastlog Date
        activity_logs = extractDriveLog(time, user_services[session['username']]['reports'])
        activity_logs.pop(0)

        # Update the log Database table when the new activities are recorded
        if(len(activity_logs) > 1):
            new_log_date = activity_logs[0].split('\t*\t')[0]
            db.add_activity_logs(activity_logs)
            db.update_log_date(new_log_date)
            for logitem in reversed(activity_logs[1:]):
                logV = logitem.split('\t*\t')
                totalLogs.append({'time':logV[0], 'activity':logV[1], 'actor': logV[5], 'resource':logV[3]})
         

    del db
    return totalLogs



####### Route for fetching Resolutions from Database ###########

@app.route('/fetch_resolutions', methods=['POST'])
def fetch_resolutions():

    action = request.form.get('action').split(':')[0].split('-')[0]
    actor = request.form.get('actor')
    document_id = request.form.get('document_id')
    current_user = request.form.get('current_user')

    # Extract Resolutions from databse with the filter parameters and also extract all the action constraints
    db = DatabaseQuery(mysql.connection, mysql.connection.cursor())
    resolutions = db.get_conflict_resolutions(action)
    del db

    if resolutions:
        return jsonify(resolutions=resolutions)
    else:
        return jsonify(resolutions=[])






if __name__ == '__main__':
    app.run(debug=True)
