/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = () => {
    let query = {};
    // TODO: implement!

    // document.getElementById(button = "Copy HTML");
    // returns an html -> save the html in test/fixutures/html 
    // take the html and convert to json

    // let datasetTypeTab = document.getElementsByTagName("form");
    let datasetTypeTab = document.getElementsByClassName("nav-item tab active");
    if (datasetTypeTab[0].getAttribute("data-type") === "courses") {
        let id = "courses";
        let jsonNavigator = query.WHERE = {};

        let conditions = document.getElementsByClassName("control-group condition");

        // WHERE/condition type
        if (conditions.length > 1) {
            if (document.getElementById("courses-conditiontype-all").getAttribute("checked") === "checked") {
                jsonNavigator = jsonNavigator.AND = {};
            } else if (document.getElementById("courses-conditiontype-any").getAttribute("checked") === "checked") {
                jsonNavigator = jsonNavigator.OR = {};
            } else if (document.getElementById("courses-conditiontype-none").getAttribute("checked") === "checked") {
                jsonNavigator = jsonNavigator.NOT = {};
            }
        }


        // WHERE/CONDITIONS

        for (let i = 0; i < conditions.length; i++) {
            // condNavigator is a temp pointer
            let condNavigator = jsonNavigator;
            if (conditions[i].getElementsByClassName("control not")[0].getElementsByTagName("input")[0].getAttribute("checked") === "checked") {
                condNavigator = condNavigator.NOT = {}
            }
            let condOP = conditions[i].getElementsByClassName("control operators")[0].getElementsByTagName("select")[0].value;
            condNavigator = condNavigator[condOP] = {};

            let condField = conditions[i].getElementsByClassName("control fields")[0].getElementsByTagName("select")[0].value;
            condField = id + "_" + condField;

            let condTerm = conditions[i].getElementsByClassName("control term")[0].getElementsByTagName("input")[0].value;

            condNavigator[condField] = condTerm;
        }


        // OPTIONS/COLUMNS

        // OPTIONS/ORDER

        // TRANSFORMATIONS/GROUP

        // TRANSFORMATIONS/APPLY

        console.log("CampusExplorer.buildQuery not implemented yet.");
    }



    if (datasetTypeTab[0].getAttribute("data-type") === "rooms") {
        let id = "rooms";
        query = {};
        console.log("CampusExplorer.buildQuery not implemented yet.");
    }


    return query;
};
