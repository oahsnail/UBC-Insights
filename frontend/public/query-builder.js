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
    let datasetTypeTab = document.getElementsByClassName("tab-panel active");
    if (datasetTypeTab[0].getAttribute("data-type") === "courses") {
        let id = "courses";
        let jsonNavigator = query.WHERE = {};

        let conditions = datasetTypeTab[0].getElementsByClassName("control-group condition");

        // WHERE/condition type
        if (conditions.length > 1) {
            if (document.getElementById("courses-conditiontype-all").getAttribute("checked") === "checked") {
                jsonNavigator = jsonNavigator.AND = [];
            } else if (document.getElementById("courses-conditiontype-any").getAttribute("checked") === "checked") {
                jsonNavigator = jsonNavigator.OR = [];
            } else if (document.getElementById("courses-conditiontype-none").getAttribute("checked") === "checked") {
                jsonNavigator = jsonNavigator.NOT = [];
            }
        }


        // WHERE/CONDITIONS

        for (let i = 0; i < conditions.length; i++) {
            let retCondObj = {};
            let condNavigator = retCondObj;
            if (conditions[i].getElementsByClassName("control not")[0].getElementsByTagName("input")[0].getAttribute("checked") === "checked") {
                condNavigator = condNavigator.NOT = {}
            }
            let condOP = conditions[i].getElementsByClassName("control operators")[0].getElementsByTagName("select")[0].value;
            condNavigator = condNavigator[condOP] = {};

            let condField = conditions[i].getElementsByClassName("control fields")[0].getElementsByTagName("select")[0].value;

            let condTerm = conditions[i].getElementsByClassName("control term")[0].getElementsByTagName("input")[0].value;
            if (isNumber(condTerm) && !(condField === "id" || condField === "uuid" || condField === "number")) {
                condTerm = Number(condTerm);
            }

            condField = id + "_" + condField;
            condNavigator[condField] = condTerm;

            if (conditions.length > 1) {
                jsonNavigator.push(retCondObj);
            } else {
                jsonNavigator = jsonNavigator[condOP] = {};
                jsonNavigator[condField] = condTerm;
            }
        }

        jsonNavigator = query.OPTIONS = {};
        // // OPTIONS/COLUMNS
        let columnNavigator = jsonNavigator.COLUMNS = [];
        let columns = datasetTypeTab[0].getElementsByClassName("form-group columns")[0].getElementsByTagName("input");

        for (let i = 0; i < columns.length; i++) {
            if (columns[i].getAttribute("checked") === "checked") {
                let colField = columns[i].value;
                if (columns[i].hasAttribute("id")) {
                    colField = id + "_" + colField;
                }
                columnNavigator.push(colField);
            }
        }

        // OPTIONS/ORDER

        let descendingChecked = false;
        let orderDescending = datasetTypeTab[0].getElementsByClassName("form-group order")[0].getElementsByTagName("input")[0];
        if (orderDescending.getAttribute("checked") === "checked") {
            query.OPTIONS.ORDER = {};
            query.OPTIONS.ORDER.dir = "DOWN";
            descendingChecked = true;
        }

        let selectedAttrs = [];
        let orderAttrs = datasetTypeTab[0].getElementsByClassName("form-group order")[0].getElementsByTagName("select")[0].getElementsByClassName("option");
        for (let i = 0; i < orderAttrs.length; i++) {
            if (orderAttrs[i].getAttribute("selected") === "selected") {
                let attrVal = orderAttrs[i].value;
                if (!orderAttrs[i].classList.contains("transformation")) {
                    attrVal = id + "_" + attrVal;
                }
                selectedAttrs.push(attrVal);
            }
        }
        if (selectedAttrs.length !== 0) {
            console.log("Selected attributes: ===============================");
            console.log(selectedAttrs);
            if (!descendingChecked) {
                query.OPTIONS.ORDER = {};
                query.OPTIONS.ORDER.dir = "UP";
            }
            query.OPTIONS.ORDER.keys = ["test"];
            query.OPTIONS.ORDER.keys.push(...selectedAttrs);
        }




        // TRANSFORMATIONS/GROUP

        // let groupsNavigator = jsonNavigator.GROUPS = [];
        // let groups = datasetTypeTab[0].getElementsByClassName("form-group groups")[0].getElementsByTagName("input");
        // for (let i = 0; i < groups.length; i++) {
        //     if (groups[i].getAttribute("checked") === "checked") {
        //         grpField = groups[i].value;
        //         if (groups[i].hasAttribute("id")) {
        //             grpField = id + "_" + grpField;
        //         }
        //         groupsNavigator.push(grpField);
        //     }

        // }

        // TRANSFORMATIONS/APPLY

    }



    if (datasetTypeTab[0].getAttribute("data-type") === "rooms") {
        let id = "rooms";
        query = {};
        console.log("CampusExplorer.buildQuery not implemented yet.");
    }


    return query;
};

function isNumber(value) {
    return /^-?[0-9]\d*(\.\d+)?$/.test(value);
}