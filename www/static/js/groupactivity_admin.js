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
        let row_data = "<tr>"
        for (j in person) {
            if (j==0) {
                row_data += `<td>${person[j]}</td>`
            }
            else {
                if (person[j]) {
                    row_data += `<td class="table-success">&check;</td>`
                }
                else {
                    row_data += `<td class="table-danger">&cross;</td>`
                }
            }
        }
        row_data += "</tr>"
        body.append(row_data)
    }

}
