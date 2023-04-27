let taskContentCache = {};
let completedTasks = [];
$(document).ready(function() {
      // Disable all task items except the first one
      $(".task:not(:first-child)").addClass("disabled");

    // Retrieve currentDateTime from sessionStorage
  let storedCurrentDateTime = sessionStorage.getItem("currentDateTime");
  if (storedCurrentDateTime) {
    // Update the current-date p tag with the storedCurrentDateTime value
    $("#current-date").attr("value", storedCurrentDateTime);
  }

    // Retrieve completed tasks from sessionStorage
  let storedCompletedTasks = sessionStorage.getItem('completedTasks');
  if (storedCompletedTasks) {
    completedTasks = JSON.parse(storedCompletedTasks);
    let lastTaskCompleted = null;
    completedTasks.forEach(taskId => {
      let task = document.getElementById(taskId);
      let nextTask = task.nextElementSibling;

      task.classList.remove("active");
      task.classList.add("completed");
      task.classList.add("disabled");
      task.removeAttribute("data-bs-toggle");
      task.removeAttribute("data-bs-target");
      task.insertAdjacentHTML("beforeend", "<span class='completed-text'> (Task completed)</span>");

      lastTaskCompleted = task;
    });

  // Activate the next task after the last completed task
  if (lastTaskCompleted) {
    activateNextTask(lastTaskCompleted);
  }
  }




  // Retrieve task content cache from sessionStorage
  let storedCache = sessionStorage.getItem('taskContentCache');
  if (storedCache) {
    taskContentCache = JSON.parse(storedCache);
  }


 // Add click event listener for tasks
$(".task").click(function() {
    if (!$(this).hasClass("disabled")) {
        // Open task modal
        let taskModalId = $(this).attr("id") + "-modal";
        let taskId = $(this).attr("id");
        openModal(taskModalId, taskId);
    }
});

  // Add click event listener for completing tasks
  $(".complete-task").click(function() {
      // Close current task modal
      let currentTaskModal = $(this).closest(".modal");
      let modalId = currentTaskModal.attr("id");
      closeModal(modalId);

      // Update the current task item
      let currentTaskItemId = modalId.replace("-modal", "");
      let currentTaskItem = $(`#${currentTaskItemId}`);
      currentTaskItem.addClass("disabled");
      currentTaskItem.append("<span class='completed-text'> (Task completed)</span>");

      // Enable the next task item
      let nextTaskItem = currentTaskItem.next(".task");
      if (nextTaskItem.length) {
          nextTaskItem.removeClass("disabled");
      } else {
          // Display a thank you message after all tasks are completed
          $(".thank-you-message").show();
      }
  });


  // Activate NExt Task for the User
  function activateNextTask(task) {
    let nextTask = task.nextElementSibling;
    if (nextTask) {
      nextTask.classList.remove("disabled");
      nextTask.classList.add("active");
      nextTask.setAttribute("data-bs-toggle", "modal"); // Add the data-bs-toggle attribute back
    }
  }


  // Add this function to handle task completion
  function completeTask(taskId) {
      let task = document.getElementById(taskId);
      let nextTask = task.nextElementSibling;

      task.classList.remove("active");
      task.classList.add("completed");
      task.classList.add("disabled");
      task.removeAttribute("data-bs-toggle");
      task.removeAttribute("data-bs-target");

      if (nextTask) {
          nextTask.classList.remove("disabled");
          nextTask.classList.add("active");
      }

      // Store the completed task in the array and update sessionStorage
    completedTasks.push(taskId);
    sessionStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    activateNextTask(task);
  }

  // Add event listeners to close buttons
  $(".close-btn").click(function() {
      let modalId = $(this).closest(".modal").attr("id");
      closeModal(modalId);
  });



  // Fetch the task
  function fetchTaskContent(taskId, modalId, callback) {
    const now = new Date();
    const currentDateTime = now.toISOString();

      // Update the current-date p tag with the currentDateTime value
    $("#current-date").attr("value", currentDateTime);

    // Store the currentDateTime value in sessionStorage for the user's login session
    sessionStorage.setItem("currentDateTime", currentDateTime);

    $.ajax({
      url: `/fetch_task_content/${taskId}`,
      type: "GET",
      beforeSend: function() {
        
        // Display loader while waiting for the response
        $("#loader").show();
      },
      success: function(data) {
        // Update the task content cache
      taskContentCache[taskId] = data;
      sessionStorage.setItem('taskContentCache', JSON.stringify(taskContentCache));
      // Insert the fetched data into the respective modal-narration
      const $modalNarration = $(`#${modalId} .modal-narration`);
      $modalNarration.html(data);

      callback(data);
      },
      complete: function() {
        // Hide the loader when the response is received
        $("#loader").hide();
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.error(`Error fetching task content: ${textStatus} - ${errorThrown}`);
      }
    });
  }


  // Show the Modal
  function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    setTimeout(() => {
      document.getElementById(modalId).classList.add('show');
    }, 50);
  }

  // Open Modal
  function openModal(modalId, taskId) {
    // Check if the content is cached
    if (taskContentCache[taskId]) {
      $("#" + modalId).find(".modal-narration").html(taskContentCache[taskId]);
      showModal(modalId);
    } else {
      
      fetchTaskContent(taskId, modalId, function(taskContent) {
        // Cache the fetched content
        taskContentCache[taskId] = taskContent;
        
        // Update modal content with the fetched task content
        $("#" + modalId).find(".modal-narration").html(taskContent);
        showModal(modalId);
      });
    }
  }
  

  function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    setTimeout(() => {
        document.getElementById(modalId).style.display = 'none';
    }, 250);
}

  // Add event listeners to modals
  $(".modal").click(function(event) {
      if (event.target === this) {
          let modalId = $(this).attr("id");
          closeModal(modalId);
      }
  });

  // Add event listeners to "complete-task" buttons
  document.querySelectorAll(".complete-task").forEach((button) => {
      button.addEventListener("click", (event) => {
          let taskId = event.target.closest(".modal").id.replace("-modal", "");
          completeTask(taskId);
      });
  });
});
function toggleEffectivenessQuestion() {
  const effectivenessQuestion = document.getElementById('effectiveness-question');
  const alternativeSolution = document.getElementById('alternative-solution');
  
  if (document.getElementById('acceptability').value != "") {
    effectivenessQuestion.classList.remove('hidden');
  } else {
    effectivenessQuestion.classList.add('hidden');
  }
  
  alternativeSolution.classList.add('hidden');
}

function toggleAlternativeSolution() {
  const alternativeSolution = document.getElementById('alternative-solution');

  if (document.querySelector('input[name="effectiveness"]:checked').value === 'no') {
    alternativeSolution.classList.remove('hidden');
  } else {
    alternativeSolution.classList.add('hidden');
  }
}