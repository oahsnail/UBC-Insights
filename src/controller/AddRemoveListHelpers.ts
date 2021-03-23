import { InsightError, NotFoundError } from "./IInsightFacade";

export class AddRemoveListHelpers {
    public static getListOfDatasetIds(insightData: any): string[] {
        let listOfDatasetIds: string[] = [];
        if (!insightData.hasOwnProperty("listOfDatasets")) {
            throw new InsightError("Invalid type of insightData passed into letListOfDatasetIds");
        }
        for (const d of insightData.listOfDatasets) {
            listOfDatasetIds.push(d.id);
        }
        return listOfDatasetIds;
    }

    public static idTestHelper(id: string, op: string, insData: any): Error {
        let matchUnderscore: RegExp = /^[^_]+$/;
        let matchOnlySpaces: RegExp = /^\s+$/;
        try {
            let ListOfDatasetIds = this.getListOfDatasetIds(insData);
            if (id === null) {
                throw new InsightError("Null ID");
            }
            if (!matchUnderscore.test(id)) {
                throw new InsightError("Underscore in id");
            }
            if (matchOnlySpaces.test(id) || id === "") {
                throw new InsightError("Only whitespaces");
            }
            if (ListOfDatasetIds.includes(id) && op === "add") {
                throw new InsightError("Cannot add, ID already exists");
            }
            if (!ListOfDatasetIds.includes(id) && op === "remove") {
                throw new NotFoundError("Cannot remove, ID does not exists");
            }
        } catch (error) {
            throw error;
        }

        return null;
    }
}
