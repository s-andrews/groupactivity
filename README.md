# Group Activity
This is a simple platform for recording the activities undertaken by a group of people.  For each day it allows them to select from a pre-defined list, a set of categorised activities which they have undertaken that day.  The data is recorded into a back-end mongodb database and can be queried to produce summaries of the activity of the group.

# Installation
Installation and comissioning of the system is a multi-step process. This is a flask application with a MongoDB backend so we're assuming that you have python and mongodb installed already.

## 1. Download the code
Clone this git respository into a suitable folder

```git clone https://github.com/s-andrews/groupactivity.git```

## 2. Create a python virtual environment
Move to the top level of the groupactivity folder and run

```python -m venv venv```

Then activate this on windows with

```venv\Scripts\activate.bat```

..or on linux with 

```. venv/Scripts/activate```

Then install the required packages

```pip install flask pymongo```

You also need ```python-ldap``` on linux you install this with

```pip install python-ldap```

On windows you'll need to download the appropriate binary from https://www.lfd.uci.edu/~gohlke/pythonlibs/#python-ldap and install the WHL file with pip.

## 3. Create a config file
You will need to create a global configuration file with the details of your installation.  The file you need is ```configuration/conf.json``` and there is a ```configuration/example_conf.json``` template which you can copy and ammend. You will need to tell the file the details of your mongodb server, as well as set up the list of people who will use the system and the categories associated with each different group.

## 4. Set up the database
Next you need to create a database and user, then populate it with the structure you're going to use.

To create a user for the system you can edit the ```database/create_database_and_user.txt``` to put in a suitable username and password (which must match what you had in the ```conf.json``` file) and then run that code in a mongsh shell.

Once the user is set up and the ```conf.json``` is written then you can run:

```python setup_database.py```

To test the database connection and set up the tables you're going to need.

## 5. Start the server
Finally you can start the flask application so the system will become active.  The way you do this will differ depending on whether you are developing the app or running in production.

For development you would move into the ```www``` folder and then run

```flask --debug --app groupactivity.py run```