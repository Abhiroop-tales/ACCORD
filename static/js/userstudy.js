$(document).ready(function() {
  // Disable all task items except the first one
  $(".task:not(:first-child)").addClass("disabled");

  // Add click event listener for tasks
  $(".task").click(function() {
      if (!$(this).hasClass("disabled")) {
          // Open task modal
          let taskModalId = $(this).attr("id") + "-modal";
          openModal(taskModalId);
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
  }

  // Add event listeners to close buttons
  $(".close-btn").click(function() {
      let modalId = $(this).closest(".modal").attr("id");
      closeModal(modalId);
  });
  function openModal(modalId) {
      document.getElementById(modalId).style.display = 'block';
      setTimeout(() => {
          document.getElementById(modalId).classList.add('show');
      }, 50);
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
