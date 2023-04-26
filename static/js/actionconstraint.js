document.addEventListener("DOMContentLoaded", function () {
    // Elements
    const documentComboBox = document.getElementById("documentComboBox");
    const actionComboBox = document.getElementById("actionComboBox");
    const actionTypeComboBox = document.getElementById("actionTypeComboBox");
    const actorComboBox = document.getElementById("actorComboBox");
    const actionValueComboBox = document.getElementById("actionValueComboBox");
    const comparatorBox = document.getElementById("comparatorBox");
    const trueValueEdit = document.getElementById("trueValueEdit");
    const clearButton = document.getElementById("clearButton");
    const addConstraintButton = document.getElementById("addConstraintButton");
  
    // Event Listeners
    documentComboBox.addEventListener("change", setTargetActors);
    actionComboBox.addEventListener("change", setActionTypes);
    actionTypeComboBox.addEventListener("change", setActionValue);
    actionValueComboBox.addEventListener("change", actionValueChanged);
  
    clearButton.addEventListener("click", clearFilter);
    addConstraintButton.addEventListener("click", addConstraint);
  
    // Initialize default options
    setFileNames();
    setActions();
  
    // Functions
    function setFileNames() {
      // Fetch and set file names in the documentComboBox
      // ...
    }
  
    function setTargetActors() {
      // Fetch and set target actors based on the selected document
      // ...
    }
  
    function setActionTypes() {
      const actionsDict = {
        "Permission Change": ["Add Permission", "Remove Permission", "Update Permission"],
        "Edit": ["Can Edit", "Time Limit Edit"],
        "Create": ["Can Create"],
        "Delete": ["Can Delete"],
        "Move": ["Can Move"],
      };
  
      const action = actionComboBox.value;
      const actionTypes = actionsDict[action] || [];
  
      // Clear and populate actionTypeComboBox
      actionTypeComboBox.innerHTML = "";
      actionTypes.forEach(type => {
        const option = document.createElement("option");
        option.textContent = type;
        actionTypeComboBox.appendChild(option);
      });
  
      setActionValue();
    }
  
    function setActionValue() {
      actionValueComboBox.innerHTML = "";
      comparatorBox.innerHTML = "";
  
      if (actionComboBox.value === "Edit" && actionTypeComboBox.selectedIndex === 1) {
        actionValueComboBox.appendChild(createOption("TRUE"));
        comparatorBox.appendChild(createOption("lt"));
        comparatorBox.appendChild(createOption("gt"));
      } else {
        actionValueComboBox.appendChild(createOption("FALSE"));
        actionValueComboBox.appendChild(createOption("TRUE"));
        comparatorBox.appendChild(createOption("eq"));
      }
      actionValueChanged();
    }
  
    function setActions() {
      const actions = [
        "Permission Change",
        "Edit",
        "Create",
        "Delete",
        "Move"
      ];
  
      // Clear and populate actionComboBox
      actionComboBox.innerHTML = "";
      actions.forEach(action => {
        const option = document.createElement("option");
        option.textContent = action;
        actionComboBox.appendChild(option);
      });
  
      setActionTypes();
    }

    // Functions
    function actionValueChanged() {
      trueValueEdit.placeholder = "-";

      if (actionValueComboBox.value === "TRUE") {
        trueValueEdit.disabled = false;

        if (actionComboBox.value === "Edit") {
          trueValueEdit.placeholder = "Enter Date Time: YYYY-MM-DDTHH:MM:SS.000Z";
        } else if (
          actionComboBox.value === "Move" ||
          actionComboBox.value === "Permission Change"
        ) {
          trueValueEdit.placeholder = "Enter the values separated by ',' Eg: A,B,C";
        }
      } else {
        trueValueEdit.disabled = true;
      }
    }


  
    function clearFilter() {
      // Clear the filter options
      // ...
    }
  
    function addConstraint() {
      // Add a new constraint based on the filter options
      // ...
    }
  
    function errorHandling(errorMessage) {
      // Display error messages
      console.error(errorMessage);
    }
  
    function createOption(text) {
      const option = document.createElement("option");
      option.textContent = text;
      return option;
    }
  });
  