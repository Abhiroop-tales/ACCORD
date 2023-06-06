let taskData = {
    1: {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Permission Change"],
        addConstraint: "Permission Change",
        constraintType: "Add Permission"
    },
    2: {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Permission Change"],
        addConstraint: "Permission Change",
        constraintType: "Remove Permission"
    },
    3:{
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Permission Change"],
        addConstraint: "Permission Change",
        constraintType: "Update Permission"
    },
    4:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Edit"],
        addConstraint: "Edit",
        constraintType: "Can Edit"
    },   
    5:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Edit"],
        addConstraint: "Edit",
        constraintType: "Time Limit Edit"
    },
    6:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Move"],
        addConstraint: "Move",
        constraintType: "Can Move"
    },
    7:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Delete"],
        addConstraint: "Delete",
        constraintType: "Can Delete"
    },
    8:  {
        actionSimulationList: ["Create", "Permission Change", "Permission Change", "Create"],
        addConstraint: "Create",
        constraintType: "Can Create"
    }
}

let rows = document.querySelectorAll(".demo-dashboard .row");
let demoTable = document.querySelector("#demo-table");
let dashboardHeader = document.querySelector("#dashboard-header");
let statusMessage = document.querySelector("#status-message");
let logTable = document.querySelector("#log-table");

rows.forEach((row, index) => {
    row.addEventListener("click", async () => {
        demoTable.style.display = "none";
        logTable.style.display = "block";

        dashboardHeader.textContent = "Detailed view of Conflict Scenario " + (index + 1);

        let currentTaskData = taskData[index+1];
        statusMessage.textContent = "Simulation is running...";
        let fileID = 'None';

        for (let [actionIndex, action] of currentTaskData.actionSimulationList.entries()) {
            let requestData = {
                action: action,
                addConstraint: currentTaskData.addConstraint,
                constraintType: currentTaskData.constraintType,
                fileID: fileID,
                actionIndex: actionIndex
            };
            
            try {
                // Fetch task content
                let response = await fetch('/fetch_task_content', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });
                fileID = await response.text();

                let currentTime = new Date().toISOString();

                // Fetch drive log
                let logResponse = await fetch('/fetch_drive_log?time=' + currentTime);
                let logData = await logResponse.json();

                // Process and display the logData in logTable here
                logData.forEach(logEntry => {
                    let rowCount = logTable.querySelector('tbody tr').length;

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

    });
});