const selects = document.querySelectorAll('.filter-options select');
    selects.forEach((select) => {
      const options = select.querySelectorAll('option');
      let maxWidth = 0;
      options.forEach((option) => {
        maxWidth = Math.max(maxWidth, option.offsetWidth);
      });
      select.style.width = '${maxWidth}px';
    });

function detectConflicts() {

        // Show the loader
        $("#detect_loader").show();

      // Get the selected values from dropdowns
      const action = $("#dropdown-1").val();
      const actor = $("#dropdown-2").val();
      const document = $("#dropdown-3").val();
  
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

          // Hide the image container
          $(".image-container").hide();
        
          // Show the logs table container
          $("#logs-table-container").show();
        
          // Clear the table
          $("#logs-table tbody").empty();
        
           // Update the table with the returned logs
            response.logs.forEach(function(log, index) {
              const row = $("<tr>");
              
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
      });
    }