import Server from "../src/rest/Server";
import * as fs from "fs-extra";
import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import { expect } from "chai";
import Log from "../src/Util";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses_2: "./test/data/courses_2.zip",
        courses3: "./test/data/courses3.zip",
        coursesnovalid: "./test/data/coursesnovalid.zip",
        coursesonevalidjson: "./test/data/coursesonevalidjson.zip",
        coursesnovalidjson: "./test/data/coursesnovalidjson.zip",
        onlyOne: "./test/data/onlyOne.zip",
        coursesempty: "./test/data/coursesempty.zip",
        coursessmallvalid: "./test/data/coursessmallvalid.zip",
        rooms: "./test/data/rooms.zip",
        rooms_2: "./test/data/rooms_2.zip",
        rooms3: "./test/data/rooms3.zip",
        roomsSmall: "./test/data/roomsSmall.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);

        // TODO: start server here once and handle errors properly
        server.start();

        Log.test(`Before all`);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        // TODO: stop server here once!
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`After: ${this.test.parent.title}`);
    });

    // Sample on how to format PUT requests
    /*
    it("PUT test for courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    */

    it("Successful PUT test for courses dataset", function () {
        try {
            return chai.request(server.getUrl())
                .put("/dataset/courses")
                .send(datasets["courses"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.test("Logging result: " + res);
                    expect(res.status).to.be.equal(200);
                    expect(res.body).to.be.equal({ result: ["courses"] });
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.test("Logging then catch error");
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.test("Failed in try catch block");
        }
    });

    it("Failed PUT test for courses dataset", function () {
        try {
            return chai.request(server.getUrl())
                .put("/dataset/courses")
                .send(datasets["courses_2"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.test("Logging result: " + res);
                    expect(res.status).to.be.equal(400);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.test("Logging then catch error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.test("Failed in catch block: " + err);
        }
    });

    it("Successful GET test for empty datasets", function () {
        try {
            return chai.request(server.getUrl())
                .get("/datasets")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.test("Logging result: " + res);
                    expect(res.status).to.be.equal(200);
                    expect(res.body).to.be.equal({ result: [] });
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.test("Logging then catch error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.test("Failed in catch block: " + err);
        }
    });

    it("Successful DELETE test for courses dataset", function () {
        try {
            return chai.request(server.getUrl())
                .del("/dataset/courses")
                // .send(datasets["courses"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.test("Logging result: " + res);
                    expect(res.status).to.be.equal(200);
                    expect(res.body).to.be.equal({ result: "courses" });
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.test("Logging then catch error");
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.test("Failed in try catch block");
        }
    });

    it("Successful DELETE 404 test for courses dataset", function () {
        try {
            return chai.request(server.getUrl())
                .del("/dataset/courses4")
                // .send(datasets["courses"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.test("Logging result: " + res);
                    expect(res.status).to.be.equal(404);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.test("Logging then catch error");
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.test("Failed in try catch block");
        }
    });

    it("Successful DELETE 400 test for courses dataset", function () {
        try {
            return chai.request(server.getUrl())
                .del("/dataset/courses_4")
                // .send(datasets["courses"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.test("Logging result: " + res);
                    expect(res.status).to.be.equal(400);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.test("Logging then catch error");
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.test("Failed in try catch block");
        }
    });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
