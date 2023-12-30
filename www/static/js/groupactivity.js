var session = ""

$( document ).ready(function() {
    show_login()

    // Action when they log in
    $("#login").click(process_login)
    $("#password").keypress(function(e){
        if(e.keyCode == 13){
            process_login();
        }
    });

    // Action when the date changes
    $("#dateselector").change(date_changed)

    // Action when they log out
    $("#logout").click(logout)

    // Set the current date
    let d = new Date()
    let dstr = d.getFullYear()+"-"+String(d.getMonth()).padStart(2,0)+"-"+String(d.getDay()).padStart(2,0)
    $("#dateselector").val(dstr)
    date_changed()

    // Populate the available activities
    populate_activities()
})

function date_changed() {
    console.log("Date changed")
    // Retrieves the activities recorded for this date already
    // and populates the set of activities

    let date = $("#dateselector").val()

    $.ajax(
        {
            url: "get_activities",
            method: "POST",
            data: {
                session: session,
                date: date
            },
            success: function(activities) {
                show_performed_activities(activities)
            },
            error: function(message) {
                console.log("Failed to get activities")
            }
        }
    )
}

function populate_activities() {

    // We need to get a list of all of the possible activities 
    // for this person and populate the list of available
    // activities.

    $.ajax(
        {
            url: "get_all_activities",
            method: "POST",
            data: {
                session: session
            },
            success: function(activities) {
                show_available_activities(activities)
            },
            error: function(message) {
                console.log("Failed to get available activities")
            }
        }
    )

}

function show_available_activities(activities) {
    // This is a list of possible activities.  We need to add these
    // to the availableactivities div

    let activitydiv = $("#availableactivities")
    for (let x in activities) {

        // Activity is a 2 element list - 0 is the activity group, 1 is the name
        let activity = activities[x]

        console.log(activity[0]+" : "+activity[1])

        activitydiv.append(`
            <div class="activity ${activity[0]}">
                <div class="activityclass">${activity[0]}</div>:
                <div class="activityname">${activity[1]}</div>
                <button class="btn btn-secondary">Add</button>
            </div>`)
    }

}

function show_performed_activities(activities) {
    // This provides a list of activities
    // which have been performed already


}


function show_login() {

    // Check to see if there's a valid session ID we can use

    session = Cookies.get("groupactivity_session_id")
    if (session) {
        // Validate the ID
        $.ajax(
            {
                url: "validate_session",
                method: "POST",
                data: {
                    session: session,
                },
                success: function(usersname) {
                    $("#logindiv").modal("hide")

                    $("#maincontent").show()

                    $("#loginname").text(usersname)

                },
                error: function(message) {
                    console.log("Existing session didn't validate")
                    session = ""
                    Cookies.remove("groupactivity_session_id")
                    $("#logindiv").modal("show")
                    show_login()
                }
            }
        )
    }
    else {
        $("#logindiv").modal("show")
    }
}

function logout() {
    session_id = ""
    Cookies.remove("groupactivity_session_id")
    $("#maincontent").hide()

    $("#logindiv").modal("show")
}




function process_login() {
    let username = $("#username").val()
    let password = $("#password").val()

    // Clear the password so they can't do it again
    $("#password").val("")

    $.ajax(
        {
            url: "login",
            method: "POST",
            data: {
                username: username,
                password: password
            },
            success: function(session_string) {
                $("#loginerror").hide()
                session = session_string

                Cookies.set("groupactivity_session_id", session, { secure: false, sameSite: 'strict' })
                show_login()
            },
            error: function(message) {
                $("#loginerror").html("Login Failed")
                $("#loginerror").show()
                setTimeout(function(){
                    $("#loginerror").hide()
                },2000)
            }
        }
    )
}

