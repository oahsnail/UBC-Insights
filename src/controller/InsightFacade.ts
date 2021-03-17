import * as fs from "fs-extra";
import Log from "../Util";
import AddCourseDataset from "./AddCourseDataset";
import { AddRemoveListHelpers } from "./AddRemoveListHelpers";
import AddRoomDataset from "./AddRoomDataset";
import {
    IInsightFacade, InsightData as InsightData, InsightDataset,
    InsightDatasetKind, InsightError
} from "./IInsightFacade";
import PerformQuery from "./PerformQuery";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    public insightData: InsightData;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.insightData = {
            listOfDatasets: [],
            listOfCourseSections: [],
            listOfRooms: [],
            numRows: 0
        };
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

        let idTestRet = AddRemoveListHelpers.idTestHelper(id, "add", this.insightData);
        if (idTestRet !== null) {
            return Promise.reject(idTestRet);
        }

        if (kind === InsightDatasetKind.Courses) {
            let addCourse = new AddCourseDataset(this.insightData);
            return addCourse.addDataset(id, content);
        } else if (kind === InsightDatasetKind.Rooms) {
            let addRoom = new AddRoomDataset(this.insightData);
            return addRoom.addDataset(id, content);
        }
    }

    public removeDataset(id: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let idTestRet = AddRemoveListHelpers.idTestHelper(id, "remove", this.insightData);
            if (idTestRet !== null) {
                return reject(idTestRet);
            }
            try {
                // removes from disk
                fs.unlinkSync("data/" + id + ".json");
                // removes from listOfDatasetIds
                // const removeIndex = this.getListOfDatasetIds().indexOf(id);
                const removeIndex = AddRemoveListHelpers.getListOfDatasetIds(this.insightData).indexOf(id);
                // this.getListOfDatasetIds().splice(removeIndex, 1);
                this.insightData.listOfDatasets.splice(removeIndex, 1);
            } catch (error) {
                return reject(new InsightError(error));
            }
            return resolve(id);
        });
    }

    public performQuery(query: any): Promise<any[]> {
        // return Promise.reject("Not implemented.");
        let p = new PerformQuery();
        return p.performQuery(query);
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise<InsightDataset[]>((resolve, reject) => {
            try {
                return resolve(this.insightData.listOfDatasets);
            } catch (error) {
                return reject(new InsightError(error));
            }
        });
    }
}
