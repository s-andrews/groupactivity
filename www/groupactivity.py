#!/usr/bin/env python3

from flask import Flask, request, render_template, make_response
import random
from pymongo import MongoClient
from bson.json_util import dumps
from pathlib import Path
import json
import ldap
import datetime

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


@app.route("/login", methods = ['POST', 'GET'])
def process_login():
    """
    Validates an username / password combination and generates
    a session id to authenticate them in future

    @username:  Their BI username
    @password:  The unhashed version of their password

    @returns:   Forwards the session code to the json response
    """
    form = get_form()
    username = form["username"].lower()
    password = form["password"]

    # Check this is a user we recognise - they must be in the 
    # global condiguration so we know which group they belong
    # to
    if not username in server_conf["people"]:
        raise ldap.INVALID_CREDENTIALS

    # Check the password against AD
    conn = ldap.initialize("ldap://"+server_conf["server"]["ldap"])
    conn.set_option(ldap.OPT_REFERRALS, 0)
    try:
        conn.simple_bind_s(username+"@"+server_conf["server"]["ldap"], password)
        sessioncode = generate_id(20)

        # We either need to update an existing person, or create
        # a new entry
        person = people.find_one({"username":username})

        if not person:
            # We're making a new person.  We can therefore query AD
            # to get their proper name and email.

            # We can theoretically look anyone up, but this filter says
            # that we're only interested in the person who logged in
            filter = f"(&(sAMAccountName={username}))"

            # The values we want to retrive are their real name (not 
            # split by first and last) and their email
            search_attribute = ["distinguishedName","mail"]

            # This does the search and gives us back a search ID (number)
            # which we can then use to fetch the result data structure
            dc_string = ",".join(["DC="+x for x in server_conf["server"]["ldap"].split(".")])
            res = conn.search(dc_string,ldap.SCOPE_SUBTREE, filter, search_attribute)
            answer = conn.result(res,0)

            # We can then pull the relevant fields from the results
            name = answer[1][0][1]["distinguishedName"][0].decode("utf8").split(",")[0].replace("CN=","")
            email = answer[1][0][1]["mail"][0].decode("utf8")

            # Now we can make the database entry for them
            new_person = {
                "username": username,
                "name": name,
                "email": email,
                "disabled": False,
                "sessioncode": ""
            }
        
            people.insert_one(new_person)

        # We can assign the new sessioncode to them and then return it
        people.update_one({"username":username},{"$set":{"sessioncode": sessioncode}})

        return(sessioncode)
    
    except ldap.INVALID_CREDENTIALS:
        raise Exception("Incorrect Username/Password from LDAP")

@app.route("/validate_session", methods = ['POST', 'GET'])
def validate_session():
    form = get_form()
    person = checksession(form["session"])
    return(str(person["name"]+" ("+server_conf["people"][person["username"]])+")")


@app.route("/admin/get_completion", methods = ['POST', 'GET'])
def get_completion():
    form = get_form()
    person = checksession(form["session"])

    # This only works if the person is allowed to admin
    # a group.

    if not person["username"] in server_conf["admins"]:
        raise Exception(person["username"]+" is not an admin")

    # We need to find the group which they admin    
    group = server_conf["admins"][person["username"]]

    # We then need to find the usernames of all of the
    # people in the group.

    usernames = []

    for username in server_conf["people"].keys():
        if server_conf["people"][username] == group:
            usernames.append(username)

    # We show data for the current week so we need to find the
    # last monday before today.  We find today and then subtract
    # the day of the week from it.  That will get us the previous 
    # Monday.
    monday = datetime.date.today() - datetime.timedelta(days=datetime.date.today().weekday())

    # We collect the dates as both readable dates and YYYY-MM-DD
    days = []
    dates = []

    for offset in range(0,5):
        thisday = monday+datetime.timedelta(offset)
        days.append(thisday.strftime("%d %b"))
        dates.append(str(thisday))
    
    # Now we need to go through the users and add their records to the data
        
    returndata = {
        "days": days,
        "people": []
    }

    for username in usernames:
        # See if we have an entry for this person
        user = people.find_one({"username":username})

        if not user:
            # We just use their username and a blank return
            returndata["people"].append([username,0,0,0,0])
        else:
            answers = [user["name"]]
            for date in dates:
                datedata = activities.find_one({"person_id":user["_id"], "date":date})
                if datedata is None or not datedata["activities"]:
                    # No return on this date for this user
                    answers.append(0)
                else:
                    answers.append(1)
            returndata["people"].append(answers)

    return jsonify(returndata)



@app.route("/get_all_activities", methods = ['POST', 'GET'])
def get_all_activities():
    form = get_form()
    person = checksession(form["session"])

    group = server_conf["people"][person["username"]]
    activities = server_conf["activities"][group]

    return jsonify(activities)

@app.route("/get_activities", methods = ['POST', 'GET'])
def get_activities():
    form = get_form()
    person = checksession(form["session"])
    date = form["date"]

    existing_activities = []
    search_result = activities.find_one({"person_id":person["_id"], "date":date})

    if search_result:
        existing_activities = search_result["activities"]
    
        return jsonify(existing_activities)
    
    return jsonify([])


@app.route("/add_activity", methods = ['POST', 'GET'])
def add_activity():
    form = get_form()
    person = checksession(form["session"])
    date = form["date"]
    activitycategory = form["activitycategory"]
    activitytext = form["activitytext"]

    search_result = activities.find_one({"person_id":person["_id"], "date":date})

    if not search_result:
        # We need to add a blank result for this date

        new_activity = {
            "person_id": person["_id"],
            "date":date,
            "activities": []
        }

        activities.insert_one(new_activity)


    activities.update_one(
        {"person_id":person["_id"], "date":date},
        {"$push":{"activities":[activitycategory,activitytext]}}
    )


    return jsonify([activitycategory,activitytext])


@app.route("/remove_activity", methods = ['POST', 'GET'])
def remove_activity():
    form = get_form()
    person = checksession(form["session"])
    date = form["date"]
    activitycategory = form["activitycategory"]
    activitytext = form["activitytext"]

    search_result = activities.find_one({"person_id":person["_id"], "date":date})

    if not search_result:
        raise Exception("Couldn't find activitiy to remove")

    activities.update_one(
        {"person_id":person["_id"], "date":date},
        {"$pull":{"activities":[activitycategory,activitytext]}}
    )

    return jsonify([activitycategory,activitytext])




def get_form():
    if request.method == "GET":
        return request.args

    elif request.method == "POST":
        return request.form


def generate_id(size):
    """
    Generic function used for creating IDs.  Makes random IDs
    just using uppercase letters

    @size:    The length of ID to generate

    @returns: A random ID of the requested size
    """
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    code = ""

    for _ in range(size):
        code += random.choice(letters)

    return code


def checksession (sessioncode):
    """
    Validates a session code and retrieves a person document

    @sessioncode : The session code from the browser cookie

    @returns:      The document for the person associated with this session
    """

    person = people.find_one({"sessioncode":sessioncode})

    # find_one still returns without exception if nothing is found so we
    # need to check that person actually exists
    if not person:
        raise Exception("Couldn't validate session")

    if "disabled" in person and person["disabled"]:
        raise Exception("Account disabled")

    if person:
        return person

    raise Exception("Couldn't validate session")



def jsonify(data):
    # This is a function which deals with the bson structures
    # specifically ObjectID which can't auto convert to json 
    # and will make a flask response object from it.
    response = make_response(dumps(data))
    response.content_type = 'application/json'

    return response

def get_server_configuration():
    with open(Path(__file__).resolve().parent.parent / "configuration/conf.json") as infh:
        conf = json.loads(infh.read())
    return conf


def connect_to_database(conf):

    client = MongoClient(
        conf['server']['address'],
        username = conf['server']['username'],
        password = conf['server']['password'],
        authSource = "groupactivity_database"
    )


    db = client.groupactivity_database

    global people
    people = db.people_collection
    global activities
    activities = db.activities_collection


# Read the main configuration
server_conf = get_server_configuration()

# Connect to the database
connect_to_database(server_conf)


