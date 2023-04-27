function resolveLog(rowNumber) {
  const conflictsData = sessionStorage.getItem("conflictsData");
  if (!conflictsData) {
    console.error("No conflicts data found in sessionStorage");
    return;
  }

  const data = JSON.parse(conflictsData);
  const log = data.logs[rowNumber];

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
    },

    success: function (response) {
      const resolutionInfoBox = $("<div>")
        .addClass("resolution-info-box")
        .attr("style", "text-align: left") // Add the style attribute for left alignment
        .html(`<p><strong>Resolution:</strong> ${response.resolution}</p>`);

      const resolutionInfoBoxRow = $("<tr>")
        .addClass("resolution-info-box-row")
        .append($("<td colspan='7'>").append(resolutionInfoBox));

      $("#us-logs-table tbody tr").eq(rowNumber + 1).after(resolutionInfoBoxRow);
    },

    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching resolutions:", textStatus, errorThrown);
    },
  });
}

function viewLog(rowNumber, briefLogs) {

  // Disable the clicked "View Log" button
  const clickedButton = $(".view-button[data-row-number='" + rowNumber + "']");
  clickedButton.prop("disabled", true);
  sessionStorage.setItem("viewButtonDisabled" + rowNumber, true);


  // Get the briefLog data for the clicked row
  const briefLog = briefLogs[rowNumber];

  // Create the information box
  const infoBox = $("<div>")
    .addClass("info-box")
    .attr("style", "text-align: left") // Add the style attribute for left alignment
    .html(`<p><strong>Activity Time:</strong> ${briefLog[0]}</p>
    <p><strong>Action:</strong> ${briefLog[1]}</p>
    <p><strong>Document ID:</strong> ${briefLog[2]}</p>
    <p><strong>Document Name:</strong> ${briefLog[3]}</p>
    <p><strong>Actor ID:</strong> ${briefLog[4]}</p>
    <p><strong>Actor Name:</strong> ${briefLog[5]}</p>`);

  // Insert the information box after the clicked row
  const infoBoxRow = $("<tr>")
    .addClass("info-box-row")
    .append($("<td colspan='7'>").append(infoBox));

  $("#us-logs-table tbody tr").eq(rowNumber).after(infoBoxRow);
}

function displayLogs(logs, briefLogs) {
  // Clear the table
  $("#us-logs-table tbody").empty();

  // Update the table with the logs
  logs.forEach(function (log, index) {
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
      .prop("disabled", sessionStorage.getItem("viewButtonDisabled" + index) === "true") // Check if the button is disabled in sessionStorage
      .on("click", function () {
        // Add logic for View button click event
        viewLog($(this).data("row-number"), briefLogs);
      });
    row.append($("<td>").append(viewButton));

    // Create and append Resolve button for the sixth column
    const resolveButton = $("<button>")
      .addClass("resolve-button")
      .text("Resolve Conflict")
      .attr("data-row-number", index) // Store the row number as a data attribute
      .on("click", function () {
        // Add logic for Resolve button click event
        resolveLog($(this).data("row-number"));
      });
    row.append($("<td>").append(resolveButton));

    // Append the row to the table body
    $("#us-logs-table tbody").append(row);
  });

  // Show the logs table container
  $("#us-logs-table-container").show();
}


function displayStoredLogs() {
  const conflictsData = sessionStorage.getItem("conflictsData");

  if (conflictsData) {
    const data = JSON.parse(conflictsData);
    displayLogs(data.logs);
    $("#us-detection-label").text(data.detectTimeLabel).show();

    // Disable and hide the "Show Conflicts" button based on sessionStorage
    if (sessionStorage.getItem("showConflictsButtonHidden") === "true") {
      $("#show-conflicts-btn").prop("disabled", true).hide();
    }

    // Display info box for each disabled button
    $(".view-button:disabled").each(function () {
      viewLog($(this).data("row-number"), data.briefLogs);
    });
  }
}

$(document).ready(function () {
  displayStoredLogs();
});

function showdetectedConflicts(modalId, buttonId) {
  const conflictsData = sessionStorage.getItem("conflictsData");

  if (conflictsData) {
    displayStoredLogs();
    return;
  }

// Disable and hide the "Show conflicts" button
$("#" + buttonId).prop("disabled", true).hide();
sessionStorage.setItem("showConflictsButtonHidden", true);

  // Show the loader
  $("#us-detect_loader").show();

  // Get action based on modalId
  let action = "";
  switch (modalId) {
    case "task1-modal":
      action = "Permission Change";
      break;
    case "task2-modal":
      action = "Move";
      break;
    case "task3-modal":
      action = "Edit";
      break;
    case "task4-modal":
      action = "Delete";
      break;
    case "task5-modal":
      action = "Create";
      break;
    default:
      console.error("Invalid modal ID");
      return;
  }

  const actor = "Any";
  const document = "Any";

  // Read the value of the current-date p tag
  const currentDateValue = $("#current-date").attr("value");

  // AJAX request to call the Python function
  $.ajax({
    url: "/detect_conflicts",
    type: "POST",
    data: {
      action: action,
      actor: actor,
      document: document,
      current_date: currentDateValue, // Include the current-date value in the request
    },

    success: function (response) {
      // Hide the loader
      $("#us-detect_loader").hide();

      // Hide the "Show conflicts" button
      $("#show-conflicts-btn").hide();

      // Store the fetched data in sessionStorage
      sessionStorage.setItem("conflictsData", JSON.stringify(response));

      // Check if the logs array is not empty
      if (response.logs.length > 0) {
        displayLogs(response.logs, response.briefLogs);
      } else {
        // If logs array is empty, hide the table and display the image
        $("#us-logs-table tbody").empty();
        $("#us-logs-table-container").hide();
      }

      // Update the text content of the detection-label paragraph tag
      $("#us-detection-label").text(response.detectTimeLabel).show();
    },
  });
}
