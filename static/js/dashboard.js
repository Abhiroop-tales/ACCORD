document.addEventListener("DOMContentLoaded", function () {
    const tabLinks = document.querySelectorAll("nav ul li a");
    const tabContents = document.querySelectorAll(".tab-content");

    function deactivateAllTabs() {
        tabLinks.forEach(link => {
            link.parentElement.classList.remove("active");
        });
    }

    function deactivateAllContents() {
        tabContents.forEach(content => {
            content.classList.remove("active");
        });
    }

    function showTabContent(targetId) {
        tabContents.forEach(content => {
            if (content.id === targetId) {
                content.classList.add("active");
            } else {
                content.classList.remove("active");
            }
        });
    }

    tabLinks.forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            const clickedLink = event.currentTarget;
            const clickedTab = clickedLink.parentElement;
            const targetId = clickedLink.getAttribute("href").substring(1);

            deactivateAllTabs();
            deactivateAllContents();

            clickedTab.classList.add("active");
            showTabContent(targetId);
        });
    });

    // Show the content of the first tab and activate it by default
    if (tabLinks.length > 0) {
        tabLinks[0].parentElement.classList.add("active");
        showTabContent(tabLinks[0].getAttribute("href").substring(1));
    }
});
