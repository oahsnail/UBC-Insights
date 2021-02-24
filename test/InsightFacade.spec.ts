import { expect } from "chai";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import { InsightDataset, InsightDatasetKind, InsightError, NotFoundError } from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This extends chai with assertions that natively support Promises
chai.use(chaiAsPromised);

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses_2: "./test/data/courses_2.zip",
        courses3: "./test/data/courses3.zip",
        coursesnovalid: "./test/data/coursesnovalid.zip",
        coursesonevalidjson: "./test/data/coursesonevalidjson.zip",
        coursesnovalidjson: "./test/data/coursesnovalidjson.zip",
        onlyOne: "./test/data/onlyOne.zip",
        coursesempty: "./test/data/coursesempty.zip",
        coursessmallvalid: "./test/data/coursessmallvalid.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
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

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset: small dataset", function () {
        const id: string = "coursessmallvalid";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should add a valid dataset: large dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should reject a empty dataset", function () {
        const id: string = "coursesempty";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add a dataset with an underscore", function () {
        const id: string = "courses_2";
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should add dataset for rooms and reject it", function () {
        const id: string = "courses";
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add a dataset with a txt file", function () {
        const id: string = "coursesonevalidjson";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add an invalid dataset with an invalid json in zip", function () {
        const id: string = "coursesnovalidjson";
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should add a Rooms dataset and reject it and add a valid dataset with courses", function () {
        const id: string = "courses";
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
            const id1: string = "courses3";
            const expected = [id1];
            futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(expected);
        });
    });

    it("Should accept a second dataset after it rejects rooms and add courses from same id", function () {
        const id: string = "courses";
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
            const expected: string[] = [id];
            futureResult = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(expected);
        });
    });

    it("Should add a valid dataset for courses with whitespace in the middle", function () {
        const id: string = "courses copy";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should add a second dataset", function () {
        const id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses3";
            expected = [id, id1];
            futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(expected);
        });
    });

    it("Should not add an invalid dataset zip file with no valid files", function () {
        const id: string = "coursesnovalid";
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add a dataset with an underscore and can list datasets", function () {
        const id: string = "courses_2";
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError).then((result: InsightDataset[]) => {
            const listFutureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
            return expect(listFutureResult).to.eventually.deep.equal(result);
        });
    });

    it("Should not add a dataset with only whitespaces", function () {
        const id: string = " ";
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add a dataset with only whitespaces", function () {
        let id: string = " ";
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
            const removeFutureResult: Promise<string> = insightFacade.removeDataset(id);
            return expect(removeFutureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Should not add id of an already added dataset", function () {
        const id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses";
            futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            return expect(futureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Should not remove an invalid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses_2";
            const removeFutureResult: Promise<string> = insightFacade.removeDataset(id1);
            return expect(removeFutureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Should not remove an invalid dataset but can remove dataset after", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            let id1: string = "courses_2";
            let removeFutureResult: Promise<string> = insightFacade.removeDataset(id1);
            return expect(removeFutureResult).to.be.rejectedWith(InsightError).then(() => {
                id1 = "courses";
                removeFutureResult = insightFacade.removeDataset(id1);
                return expect(removeFutureResult).to.eventually.deep.equal(id1);
            });
        });
    });

    it("Should not remove an invalid dataset with whitespace id", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = " ";
            const removeFutureResult: Promise<string> = insightFacade.removeDataset(id1);
            return expect(removeFutureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Should remove a valid dataset", function () {
        const id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses3";
            expected = [id, id1];
            futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
                const removeFutureResult: Promise<string> = insightFacade.removeDataset(id);
                return expect(removeFutureResult).to.eventually.deep.equal(id);
            });
        });
    });

    it("Should remove a valid dataset and add a dataset", function () {
        const id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses3";
            expected = [id, id1];
            futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
                const removeFutureResult: Promise<string> = insightFacade.removeDataset(id);
                return expect(removeFutureResult).to.eventually.deep.equal(id).then(() => {
                    futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
                    return expect(futureResult).to.eventually.deep.equal(expected);
                });
            });
        });
    });


    it("Should remove a valid dataset and list it", function () {
        const id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses3";
            expected = [id, id1];
            futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
                expected = [id1];
                const removeFutureResult: Promise<string> = insightFacade.removeDataset(id);
                return expect(removeFutureResult).to.eventually.deep.equal(expected)
                    .then((result: InsightDataset[]) => {
                        const listFutureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
                        return expect(listFutureResult).to.eventually.deep.equal(result);
                    });
            });
        });
    });
    it("Should not remove an unexisting dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses3";
            const removeFutureResult: Promise<string> = insightFacade.removeDataset(id1);
            return expect(removeFutureResult).to.be.rejectedWith(NotFoundError);
        });
    });

    it("Should not remove an unexisting dataset but can add dataset after", function () {
        const id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses3";
            const removeFutureResult: Promise<string> = insightFacade.removeDataset(id1);
            return expect(removeFutureResult).to.be.rejectedWith(NotFoundError).then(() => {
                expected = [id, id1];
                futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
                return expect(futureResult).to.eventually.deep.equal(expected);
            });
        });
    });

    it("Should not remove an unexisting dataset when there are none", function () {
        const id: string = "courses";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(NotFoundError);
    });

    it("Should list datasets without any added datasets", function () {
        const expected: InsightDataset[] = [];
        const listFutureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
        return expect(listFutureResult).to.eventually.deep.equal(expected);
    });

    it("Should list datasets without any added datasets and list datasets when called a second time", function () {
        const expected: InsightDataset[] = [];
        let listFutureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
        return expect(listFutureResult).to.eventually.deep.equal(expected).then(() => {
            listFutureResult = insightFacade.listDatasets();
            return expect(listFutureResult).to.eventually.deep.equal(expected);
        });
    });


    it("Should list all datasets", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then((result: InsightDataset[]) => {
            const listFutureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
            return expect(listFutureResult).to.eventually.deep.equal(result);
        });
    });

    it("Should add a second dataset and list all datasets", function () {
        const id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const id1: string = "courses3";
            expected = [id, id1];
            futureResult = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(expected).then((result: InsightDataset[]) => {
                const listFutureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
                return expect(listFutureResult).to.eventually.deep.equal(result);
            });
        });
    });


    it("should successfully list the datasets (empty case)", function () {
        const listResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
        return expect(listResult).to.eventually.deep.equal([]);
    });

    it("should successfully list the datasets (valid case)", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                const Idataset1: InsightDataset = {
                    id: "courses",
                    kind: InsightDatasetKind.Courses,
                    numRows: 64612
                };
                const listResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
                const expectedList: InsightDataset[] = [Idataset1];
                return expect(listResult).to.eventually.deep.equal(expectedList);
            }).then(() => {
                const id2: string = "onlyOne";
                const expected2: string[] = [id, id2];
                const futureResult2: Promise<string[]> = insightFacade.addDataset(
                    id2,
                    datasets["onlyOne"],
                    InsightDatasetKind.Courses,
                );
                return expect(futureResult2).to.eventually.deep.include(expected2);
            }).then(() => {
                const Idataset1: InsightDataset = {
                    id: "courses",
                    kind: InsightDatasetKind.Courses,
                    numRows: 64612
                };
                const Idataset2: InsightDataset = {
                    id: "onlyOne",
                    kind: InsightDatasetKind.Courses,
                    numRows: 2
                };

                const listResult2: Promise<InsightDataset[]> = insightFacade.listDatasets();
                const expectedList: InsightDataset[] = [Idataset1, Idataset2];
                return expect(listResult2).to.eventually.deep.include(expectedList);
            });
    });

});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: {
        [id: string]: { path: string; kind: InsightDatasetKind };
    } = {
        courses: {
            path: "./test/data/courses.zip",
            kind: InsightDatasetKind.Courses,
        },
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more test queries. ${err}`,
            );
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(
                insightFacade.addDataset(id, data, ds.kind),
            );
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * TODO For C1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<
                        any[]
                    > = insightFacade.performQuery(test.query);
                    return TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    });
});
