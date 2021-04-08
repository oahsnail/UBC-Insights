/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        // Referenced Katharine's C3 slides and https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget/onload
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/query", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = (res) => {
            if (res) {
                let renderJson = JSON.parse(res.target.response);
                resolve(renderJson);
            }
        }
        xhr.addEventListener("error", (err) => {
            reject(err);
        })
        xhr.send(JSON.stringify(query));
        // console.log("CampusExplorer.sendQuery not implemented yet.");
    });
};
