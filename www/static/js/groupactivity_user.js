// This is the code which is specific to the user facing page

$( document ).ready(function() {

    // Action when the date changes
    $("#dateselector").change(date_changed)

    // Set the current date and don't let them set dates in
    // the future or more than a month ago
    let d = new Date()
    let dstr = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,0)+"-"+String(d.getDate()).padStart(2,0)
    $("#dateselector").val(dstr)

    // They can't select anything after today
    $("#dateselector").attr("max",dstr)

    // They can only add events for the last two weeks
    d = new Date(d.getTime() - (14 * 24 * 60 * 60 * 1000))
    dstr = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,0)+"-"+String(d.getDate()).padStart(2,0)
    $("#dateselector").attr("min",dstr)

})

function load_initial_content() {
    populate_activities()
    date_changed()
}

function clear_loaded_content() {
    $("#availableactivities").empty()
    $("#usedactivities").empty()
}

function date_changed() {
    // Retrieves the activities recorded for this date already
    // and populates the set of activities

    let date = $("#dateselector").val()
    console.log("Date changed to "+date)

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
                alert("Failed to get activities")
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
                alert("Failed to get available activities")
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

        // We need to add it to the used activities list
        activitydiv.append(`
            <div class="activity availableactivity rounded ${activity[0]}">
                <div class="activityclass">${activity[0]}</div>:
                <div class="activityname">${activity[1]}</div>
            </div>`)
    }

    // Set the action on these new activities
    $(".availableactivity").unbind("click")
    $(".availableactivity").click(add_activity)

}

function add_activity() {
    let category = $(this).find("div").eq(0).text()
    let activity = $(this).find("div").eq(1).text()
    let date = $("#dateselector").val()

    $.ajax(
        {
            url: "add_activity",
            method: "POST",
            data: {
                session: session,
                date: date,
                activitycategory: category,
                activitytext: activity
            },
            success: function(activity) {
                let activitydiv = $("#usedactivities")
                add_performed_activity(activitydiv,activity) 

                // Reset the click events
                $(".usedactivity").unbind("click")
                $(".usedactivity").click(remove_activity)
            
                
            },
            error: function(message) {
                alert("Failed to add new activity")
            }
        }
    )
}

function remove_activity() {
    let category = $(this).find("div").eq(0).text()
    let activity = $(this).find("div").eq(1).text()
    let date = $("#dateselector").val()

    $(this).remove()

    $.ajax(
        {
            url: "remove_activity",
            method: "POST",
            data: {
                session: session,
                date: date,
                activitycategory: category,
                activitytext: activity
            },
            success: function(activity) {
                // Add this back to the options for the 
                // available activities
                $("#availableactivities").find("."+activity[0]).find(".activityname").filter(function(){ return $(this).text() === activity[1];}).parent().show()

            },
            error: function(message) {
                alert("Failed to remove activity")
            }
        }
    )
}



function show_performed_activities(activities) {
    // This provides a list of activities
    // which have been performed already

    // We need to set all of the possible activities
    // back to being visible as they may have been
    // hidden
    $("#availableactivities").find(".activity").show()
    $("#usedactivities").empty()

    let activitydiv = $("#usedactivities")
    for (let x in activities) {

        // Activity is a 2 element list - 0 is the activity group, 1 is the name
        let activity = activities[x]

        add_performed_activity(activitydiv,activity)
    }

    // Set the action on these new activities
    $(".usedactivity").unbind("click")
    $(".usedactivity").click(remove_activity)
    
}

function add_performed_activity(div,activity) {
    // Remove this from the set of available activities
    $("#availableactivities").find("."+activity[0]).find(".activityname").filter(function(){ return $(this).text() === activity[1];}).parent().hide()

    div.append(`
    <div class="activity usedactivity rounded ${activity[0]}">
        <div class="activityclass">${activity[0]}</div>:
        <div class="activityname">${activity[1]}</div>
    </div>`)
}