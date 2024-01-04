// This is the code which is specific to the admin page

function load_initial_content() {
    // Set the click events for the previous next buttons
    $("#completionprevious").unbind()
    $("#completionprevious").click(function() {get_completion($("#completionprevious").data("date"))})
    $("#completionnext").unbind()
    $("#completionnext").click(function() {get_completion($("#completionnext").data("date"))})
    get_completion("")
}

function clear_loaded_content() {
    $("#groupname").text("")
    $("#completionheader").empty()
    $("#completionbody").empty()
    $("#completion_user").text("")
    $("#completion_date").text("")
    $("#completion_activities").empty()
}

function get_completion(date) {
    $.ajax(
        {
            url: "admin/get_completion",
            method: "POST",
            data: {
                session: session,
                date: date
            },
            success: function(completion_data) {
                write_completion_data(completion_data)
            },
            error: function(message) {
                alert("Failed to get completion data")
            }
        }
    )
}

function write_completion_data (completion_data) {
    console.log("Writing completion data")
    // We're populating the table of completion data. We have the 
    // list of dates we're using and then the completion for each
    // of the people

    // Clear and repopulate the group name
    $("#groupname").text(`${completion_data["group"]}`)

    // Add the previous/next dates to the appropriate buttons
    $("#completionprevious").data("date",completion_data["previous"])
    $("#completionnext").data("date",completion_data["next"])

    // Clear and repopulate the header
    let header = $("#completionheader")
    header.empty()
    header.append("<th>People</th>")
    for (i in completion_data["days"]) {
        header.append(`<th>${completion_data["days"][i]}`)
    }

    // Clear and repopulate the body
    let body = $("#completionbody")
    body.empty()
    for (i in completion_data["people"]) {
        let person = completion_data["people"][i]
        let row_data = `<tr data-username=${person[i][1]}>`
        for (j in person) {
            if (j==0) {
                row_data += `<td>${person[j][0]}</td>`
            }
            else {
                if (person[j]) {
                    row_data += `<td class="table-success completionvalue" data-date="${completion_data["dates"][j-1]}">&check;</td>`
                }
                else {
                    row_data += `<td class="table-danger">&cross;</td>`
                }
            }
        }
        row_data += "</tr>"
        body.append(row_data)
    }

    //  Update the bindings
    $(".completionvalue").unbind()
    $(".completionvalue").click(show_completion_details)

}

function show_completion_details() {
    let date = $(this).data("date")
    let username = $(this).parent().data("username")

    $.ajax(
        {
            url: "admin/completion_details",
            method: "POST",
            data: {
                session: session,
                date: date,
                username: username
            },
            success: function(completion_data) {
                write_completion_details(completion_data)
            },
            error: function(message) {
                alert("Failed to get completion details")
            }
        }
    )
}

function write_completion_details(completion_data) {
    $("#completion_user").text(`${completion_data["name"]}`)
    $("#completion_date").text(`${completion_data["date"]}`)

    let div = $("#completion_activities")

    div.empty()

    for (i in completion_data["activities"]) {
        activity = completion_data["activities"][i]
        div.append(`
        <div class="activity usedactivity rounded ${activity[0]}">
            <div class="activityclass">${activity[0]}</div>:
            <div class="activityname">${activity[1]}</div>
        </div>`)
    }
}