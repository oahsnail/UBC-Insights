/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import { InsightError } from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";
import Log from "../Util";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    private static insightFacade: InsightFacade = new InsightFacade();

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({ mapFiles: true, mapParams: true }));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);

                // NOTE: your endpoints should go here
                that.rest.get("/datasets", Server.getDatasets); // TODO not sure if works
                that.rest.put("/dataset/:id/:kind", Server.putDataset); // TODO not sure if works
                that.rest.del("/dataset/:id", Server.deleteDataset);
                that.rest.post("/query", Server.postQuery);

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    public getUrl() {
        return this.rest.url;
    }

    // public resetInsightFacade() {
    //     this.insightFacade = new InsightFacade();
    // }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, { result: response });
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, { error: err });
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

    private static putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        let id = req.params.id;
        let kind = req.params.kind;
        let zip = req.body.toString("base64");
        Log.test("id" + id);
        Log.test("kind" + kind);
        Server.insightFacade.addDataset(id, zip, kind).then((retList) => {
            Log.test("Reached here");
            res.json(200, { result: retList });
            return next();
        }).catch((err) => {
            res.json(400, { error: err });
            return next();
        });
    }

    private static postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        let query = req.body;
        Server.insightFacade.performQuery(query).then((resArr) => {
            if (resArr) {
                res.json(200, { result: resArr });
                return next();
            }
        }).catch((err) => {
            res.json(400, { error: "error" });
            return next();
        });
    }

    private static deleteDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        let id = req.params.id;
        Server.insightFacade.removeDataset(id).then((idStr) => {
            res.json(200, { result: idStr });
            return next();
        }).catch((err) => {
            if (err.includes("InsightError")) {
                res.json(400, { error: "error" });
            } else if (err.includes("NotFoundError")) {
                res.json(404, { error: "dataset not found" });
            }
            return next();
        });
    }

    private static getDatasets(req: restify.Request, res: restify.Response, next: restify.Next) {
        // if (req.url !== "/datasets") {
        //     Log.test("invalid url for getDatasets");
        //     return next();
        // }
        Server.insightFacade.listDatasets().then((retList) => {
            if (retList) {
                res.json(200, { result: retList });
                return next();
            }
        });

        return next();
    }
}
