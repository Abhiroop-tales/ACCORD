let taskData = {
    1: {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Permission Change","Edit"],
        addConstraint: "Permission Change",
        constraintType: "Add Permission"
    },
    2: {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Permission Change", "Edit"],
        addConstraint: "Permission Change",
        constraintType: "Remove Permission"
    },
    3:{
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Permission Change","Edit"],
        addConstraint: "Permission Change",
        constraintType: "Update Permission"
    },
    4:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Edit","Permission Change"],
        addConstraint: "Edit",
        constraintType: "Can Edit"
    },   
    5:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Edit", "Permission Change"],
        addConstraint: "Edit",
        constraintType: "Time Limit Edit"
    },
    6:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Move", "Edit"],
        addConstraint: "Move",
        constraintType: "Can Move"
    },
    7:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Delete", "Create"],
        addConstraint: "Delete",
        constraintType: "Can Delete"
    },
    8:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Create", "Edit"],
        addConstraint: "Create",
        constraintType: "Can Create"
    }
}

let rows = document.querySelectorAll(".demo-dashboard .row");
let demoTable = document.querySelector("#demo-table");
let dashboardHeader = document.querySelector("#dashboard-header");
let statusMessage = document.querySelector("#status-message");
let logTable = document.querySelector("#log-table");
var detectDate = document.getElementById("detect-date");

rows.forEach((row, index) => {
    row.addEventListener("click", async () => {
        demoTable.style.display = "none";
        logTable.style.display = "block";

        dashboardHeader.textContent = "Detailed view of Conflict Scenario " + (index + 1);

         // Capture column values
         let scenario = row.children[1].textContent; // second column
         let conflictType = row.children[2].textContent; // third column
         let conflict = row.children[3].textContent; // fourth column
         
         // Update the selected conflict info
         document.getElementById("conflict-text").textContent = conflict;
         document.getElementById("conflict-type").textContent = conflictType;
         document.getElementById("conflict-scenario").textContent = scenario;
 
         // Enable the selected conflict info div
         document.getElementById("selected-conflict-info").style.display = "block";

        let currentTaskData = taskData[index+1];
        statusMessage.textContent = "Simulation is running...";
        document.getElementById("loading-image").style.display = "inline";
        let fileID = 'None';
        
        
        // Fetch task content
        let currentTime = new Date();
        currentTime.setSeconds(currentTime.getSeconds() - 60);

        let startTime = currentTime.toISOString();
        // Update the date
        detectDate.textContent = startTime;
       
        for (let [actionIndex, action] of currentTaskData.actionSimulationList.entries()) {
            let requestData = {
                action: action,
                addConstraint: currentTaskData.addConstraint,
                constraintType: currentTaskData.constraintType,
                fileID: fileID,
                actionIndex: actionIndex
            };
            let currentTime = new Date();
            currentTime.setSeconds(currentTime.getSeconds() - 55);

            let updatedTime = currentTime.toISOString();
            try {
                
                let response = await fetch('/fetch_task_content', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });
                fileID = await response.text();
                
                // Fetch drive log
                let logResponse = await fetch('/fetch_drive_log?time=' + updatedTime);
                let logData = await logResponse.json();
                
                // Clear all rows
                logTable.querySelector('tbody').innerHTML = '';

                // Process and display the logData in logTable here
                logData.forEach(logEntry => {
                    let rowCount = logTable.querySelectorAll('tbody tr').length;

                    let newRow = document.createElement('tr');
                    newRow.innerHTML = `<td>${rowCount + 1}</td>
                                        <td>${logEntry.activity}</td>                                       
                                        <td>${logEntry.resource}</td>
                                        <td>${logEntry.actor}</td>
                                        <td>${logEntry.time}</td>`;

                    logTable.querySelector('tbody').append(newRow);
                });
                

               
            } catch (error) {
                console.error("Error:", error);
            }
        }

        let counter = 0;
        let intervalID = setInterval(async function() {
            // Fetch drive log
            let logResponse = await fetch('/fetch_drive_log?time=' + startTime);
            let logData = await logResponse.json();

            // Clear all rows
            logTable.querySelector('tbody').innerHTML = '';

            // Process and display the logData in logTable here
            logData.forEach(logEntry => {
                let rowCount = logTable.querySelectorAll('tbody tr').length;

                let newRow = document.createElement('tr');
                newRow.innerHTML = `<td>${rowCount + 1}</td>
                                    <td>${logEntry.activity}</td>                                       
                                    <td>${logEntry.resource}</td>
                                    <td>${logEntry.actor}</td>
                                    <td>${logEntry.time}</td>`;

                logTable.querySelector('tbody').append(newRow);
            });

            counter++;

            // If code has been run 5 times, stop the interval
            if (counter >= 10) {
                statusMessage.textContent = "Simulation Completed !!"
                document.getElementById("loading-image").style.display = "none";

                 // Enable the "Detect Conflicts" button
                var detectConflictsButton = document.getElementById("detect-conflicts-button");
                detectConflictsButton.removeAttribute("disabled");

                // Send HTTP POST request to /refresh_logs
                fetch('/refresh_logs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                    // Optionally, you can also send data in the request body if needed
                    // body: JSON.stringify({key: 'value'})
                }).then(response => {
                    // You can handle the response here if needed
                    console.log(response);
                }).catch(error => {
                    // Handling errors
                    console.error('Error:', error);
                });
                
                clearInterval(intervalID);
                
            }
        }, 2000);        

    });
});


function executeResolution() {
    // Extract constraints from session storage
    const constraints = sessionStorage.getItem("constraints");

    // Send an HTTP request to the endpoint with data from session storage constraints
    $.ajax({
        url: '/execute_resolution',
        type: 'POST',
        data: {
            constraints: constraints
        },
        success: function (response) {
            // Handle the success response here
            console.log("Resolution executed successfully.");
        },
        error: function (error) {
            // Handle error response here
            console.error("Error executing resolution:", error);
        }
    });
}

function displayResolutionInfoBox(rowNumber, response) {
    // Extract the Resolution Action and set of resolutions
    const resolutionAction = response.resolutions[0];
    const resolutions = response.resolutions[1].split(',');
    const preventives = response.resolutions[2].split(',');
    const resolved = response.resolved;
  
    // Create an array of resolution paragraphs
    const resolutionParagraphs = resolutions.map(function (resolution) {
      return `<p><strong>Resolution: </strong>${resolution}</p>`;
    });
  
    // Join the resolution paragraphsresolveLog
    const resolutionsHtml = resolutionParagraphs.join('');

    // Create an array of preventive paragraphs
    const preventiveresolutionParagraphs = preventives.map(function (preventive) {
        return `<p><strong>Preventive Resolution: </strong>${preventive}</p>`;
      });
    
      // Join the resolution paragraphsresolveLog
      const preventiveresolutionsHtml = preventiveresolutionParagraphs.join('');

    // Create the button
    let buttonHtml = '';
    if (resolved === "True") {
        buttonHtml = '<button id="resolve-conflicts-button" disabled>Resolved</button>';
    } else {
        buttonHtml = `<button id ="resolve-conflicts-button" onclick="executeResolution()">Execute resolution</button>`;
    }

  
    const resolutionInfoBox = $("<div>")
      .addClass("resolution-info-box")
      .attr("style", "text-align: left") // Add the style attribute for left alignment
      .html(`<p><strong>Resolution Action:</strong> ${resolutionAction}</p>${resolutionsHtml}<br>${buttonHtml}<br>${preventiveresolutionsHtml}`);
  
    const resolutionInfoBoxRow = $("<tr>")
      .addClass("resolution-info-box-row")
      .append($("<td colspan='7'>").append(resolutionInfoBox));
  
    $("#logs-table tbody tr").eq(rowNumber + 1).after(resolutionInfoBoxRow);
}

function resolveLog(rowNumber) {
     
    // Disable the clicked "Resolve" button
    const clickedResolveButton = $(".resolve-button[data-row-number='" + rowNumber + "']");
    clickedResolveButton.prop("disabled", true);
    sessionStorage.setItem("resolveButtonDisabled" + rowNumber, true);
    
    const conflictsData = sessionStorage.getItem("conflictsData");
    if (!conflictsData) {
      console.error("No conflicts data found in sessionStorage");
      return;
    }
  
    const data = JSON.parse(conflictsData);
    const log = data.logs[rowNumber];
  
    const activityTime = log[0];
    const documentId = log[2];
    const action = log[1];
    const actor = log[3];
    // Fetch the username from the .user-info div
    const userInfoText = $(".user-info").text();
    const currentUser = userInfoText.split('|')[0].trim();
  
    $.ajax({
      url: "/fetch_resolutions",
      type: "POST",
      data: {
        document_id: documentId,
        action: action,
        actor: actor,
        current_user: currentUser,
        activity_time:activityTime
      },
  
      success: function (response) {
        // Store the fetched resolution data in sessionStorage
        sessionStorage.setItem("resolutionsData" + rowNumber, JSON.stringify(response));
      
        // Display the resolution info box
        displayResolutionInfoBox(rowNumber, response);
      },
      
  
      error: function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching resolutions:", textStatus, errorThrown);
      },
    });
  }


function clearConflicts() {
    $("#logs-table tbody").empty();
    $("#logs-table-container").hide();
    $(".image-container").show();
  
    $("#detection-label").hide();
  }

function viewLog(rowNumber, briefLogs) {

    // Disable the clicked "View Log" button
    const clickedButton = $(".view-button[data-row-number='" + rowNumber + "']");
    clickedButton.prop("disabled", true);
    sessionStorage.setItem("viewButtonDisabled" + rowNumber, true);


    // Get the briefLog data for the clicked row
    const briefLog = briefLogs[rowNumber];

    // Extract required parameters
    const doc_id = briefLog[2]; // assuming that doc_id is the third element in the briefLog
    const action = briefLog[1]; // assuming that action is the second element in the briefLog
    const action_type = "LIKE '%'"; // you need to define this
    const constraint_target = briefLog[5]; // you need to define this

    // Make an AJAX request to get the action constraints
    $.ajax({
        url: '/get_action_constraints',
        type: 'POST',
        data: {
            doc_id: doc_id,
            action: action,
            action_type: action_type,
            constraint_target: constraint_target
        },
        success: function (response) {
            // Create the information box
            const infoBox = $("<div>")
                .addClass("info-box")
                .attr("style", "text-align: left")
                .html(`
                    <p><strong>Activity Time:</strong> ${briefLog[0]}</p>
                    <p><strong>Action:</strong> ${briefLog[1]}</p>
                    <p><strong>Document ID:</strong> ${briefLog[2]}</p>
                    <p><strong>Document Name:</strong> ${briefLog[3]}</p>
                    <p><strong>Actor ID:</strong> ${briefLog[4]}</p>
                    <p><strong>Actor Name:</strong> ${briefLog[5]}</p>
                    <p><strong>Action Constraints set by: </strong> ${response[4]}</p>

                `);

            // Insert the information box after the clicked row
            const infoBoxRow = $("<tr>")
                .addClass("info-box-row")
                .append($("<td colspan='7'>").append(infoBox));

            $("#logs-table tbody tr").eq(rowNumber).after(infoBoxRow);
        },
        error: function (error) {
            console.error("Error fetching action constraints:", error);
        }
    });

      // Insert the information box after the clicked row
    const infoBoxRow = $("<tr>")
        .addClass("info-box-row")
        .append($("<td colspan='7'>").append(infoBox));

    $("#logs-table tbody tr").eq(rowNumber).after(infoBoxRow);
}

function callDetectConflictsDemo(currentDate) {
    // Show the loader
    $("#detect_loader").show();
    clearConflicts();
    fetch('/detect_conflicts_demo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `current_date=${currentDate}`, // Sending current_date as a form parameter
    })
    .then(response => {
        // Hide the loader
        $("#detect_loader").hide();
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json(); // Here, you can also use response.text() if you are expecting text
    })
    .then(data => {
        

        // Check if the logs array is not empty
        if (data.logs.length > 0) {
          
            // Show the logs table container
            $("#logs-table-container").show();
          
            // Clear the table
            $("#logs-table tbody").empty();
          
            // Update the table with the returned logs
            data.logs.forEach(function(log, index) {
                const row = $("<tr>");
                
                // Add index as the first column
                row.append($("<td>").text(index + 1));
                
                // Append first four columns from log data
                for (let i = 0; i < 4; i++) {
                    row.append($("<td>").text(log[i]));
                }
    
                // Create and append View button for the fifth column
                const viewButton = $("<button>")
                    .addClass("view-button")
                    .text("View Conflict")
                    .attr("data-row-number", index) // Store the row number as a data attribute
                    .on("click", function() {
                        // Add logic for View button click event
                        viewLog($(this).data("row-number"), data.briefLogs);
                    });
                row.append($("<td>").append(viewButton));
    
                // Create and append Resolve button for the sixth column
                const resolveButton = $("<button>")
                    .addClass("resolve-button")
                    .text("Resolve Conflict")
                    .attr("data-row-number", index) // Store the row number as a data attribute
                    .on("click", function() {
                        // Add logic for Resolve button click event
                        resolveLog($(this).data("row-number"));
                    });
                row.append($("<td>").append(resolveButton));
    
                // Append the row to the table body
                $("#logs-table tbody").append(row);

                // Store the fetched data in sessionStorage
                sessionStorage.setItem("conflictsData", JSON.stringify(data));
            });
        }
        else {
            // If logs array is empty, hide the table and display the image
            // Clear the table
            $("#logs-table tbody").empty();
            $("#logs-table-container").hide();
            $(".image-container").show();
        }
        
        // Update the text content of the detection-label paragraph tag
        $("#detection-label").text(data.detectTimeLabel).show();

        // Hide the loader
        $("#detect_loader").hide();
        // Get the modal
        var modal = document.getElementById("myModal");
        modal.style.display = "block";
        


    })
    .catch(error => {
        // Handle errors
        console.error('Error:', error);

        // Hide the loader in case of error
        $("#detect_loader").hide();
    });
}

document.getElementById("detect-conflicts-button").addEventListener("click", function() {
    
    // Call the function here with the required parameter
    callDetectConflictsDemo(detectDate.textContent);

});

// Get the modal
var modal = document.getElementById("myModal");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

