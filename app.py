from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_mysqldb import MySQL
import yaml, hashlib, os
from functools import wraps
from serviceAPI import create_user_driveAPI_service, create_directoryAPI_service
from detection import get_filteroptions

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

            # Store services in the global services dictionary
            user_services[session['username']] = {'drive': drive_service, 'directory': directory_service}


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

        return render_template('dashboard.html', user_role='admin', username=session['username'], options_actor=options_actor, options_document=options_document)
    else:
        return redirect(url_for('login'))

@app.route('/user_dashboard')
def user_dashboard():
    if 'user_id' in session and session['user_role'] != 'admin':

        drive_service = user_services[session['username']]['drive']
        directory_service = user_services[session['username']]['directory']
        options_actor, options_document = get_filteroptions(drive_service, directory_service)

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

if __name__ == '__main__':
    app.run(debug=True)
