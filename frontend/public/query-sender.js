/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/query", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = (res) => {
            resolve(res);
        }
        xhr.addEventListener("error", (err) => {
            reject(err);
        })
        xhr.send(JSON.stringify(query));
        // console.log("CampusExplorer.sendQuery not implemented yet.");
    });
};
