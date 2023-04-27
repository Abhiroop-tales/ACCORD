function detectConflicts() {

    // Show the loader
    $("#detect_loader").show();

  // Get the selected values from dropdowns
  const action = $("#dropdown-1").val();
  const actor = "Any";
  const document = "Any";

  // AJAX request to call the Python function
  $.ajax({
    url: "/detect_conflicts",
    type: "POST",
    data: {
      action: action,
      actor: actor,
      document: document
    },

    success: function(response) {

      // Hide the loader
      $("#detect_loader").hide();
      
      // Check if the logs array is not empty
      if (response.logs.length > 0) {
        // Hide the image container
        $(".image-container").hide();
      
        // Show the logs table container
        $("#logs-table-container").show();
      
        // Clear the table
        $("#logs-table tbody").empty();


      
        // Update the table with the returned logs
          response.logs.forEach(function(log, index) {
            const row = $("<tr>");
            
            // Add index as the first column
            row.append($("<td>").text(index + 1));
            
            // Append first four columns from log data
            for (let i = 0; i < 4; i++) {
              row.append($("<td>").text(log[i]));
            }

            // Create and append View button for the fifth column
            const viewButton = $("<button>")
            .addClass("btn btn-primary btn-sm view-button")
            .text("View Conflict")
            .attr("data-row-number", index) // Store the row number as a data attribute
            .on("click", function() {
              // Add logic for View button click event
              viewLog($(this).data("row-number"));
            });
            row.append($("<td>").append(viewButton));

            // Create and append Resolve button for the sixth column
            const resolveButton = $("<button>")
            .addClass("btn btn-success btn-sm resolve-button")
            .text("Resolve Conflict")
            .attr("data-row-number", index) // Store the row number as a data attribute
            .on("click", function() {
              // Add logic for Resolve button click event
              resolveLog($(this).data("row-number"));
            });
            row.append($("<td>").append(resolveButton));

            // Append the row to the table body
            $("#logs-table tbody").append(row);
       
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
    $("#detection-label").text(response.detectTimeLabel).show();
    }
  });
}