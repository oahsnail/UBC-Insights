import JSZip = require("jszip");
import http = require("http");
import parse5 = require("parse5");
import AddDataset from "./AddDataset";
import { InsightData, InsightError, NotFoundError } from "./IInsightFacade";

export default class AddRoomDataset extends AddDataset {
    private shortnameArrayFromIndexHTML: string[];
    public insightData: InsightData;
    constructor(insData: InsightData) {
        super();
        this.shortnameArrayFromIndexHTML = [];
        this.insightData = insData;
    }

    public getGeoLocation(encodedAddr: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team195/" + encodedAddr;
            try {
                http.get(url, (res) => {
                    res.setEncoding("utf8");
                    let rawData: string = "";
                    res.on("data", (chunk) => {
                        rawData += chunk;
                    });
                    res.on("end", () => {
                        let jsonObj = JSON.parse(rawData);
                        if (jsonObj.hasOwnProperty("error")) {
                            return reject(new NotFoundError(jsonObj.error));
                        }
                        return resolve(JSON.parse(rawData));
                    });
                });
            } catch (error) {
                return reject(new InsightError(error));
            }
        });
    }

    public parseHTML(html: string): Promise<parse5.Document> {
        return Promise.resolve(parse5.parse(html));
    }

    // TODO
    public fillShortnameArrayFromIndexHTML(htmlJSON: any): boolean {
        // From: Noa's c2 video posted on piazza
        if (htmlJSON.nodeName === "td" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-building-code") {
            this.shortnameArrayFromIndexHTML.push(htmlJSON.childNodes[0].value.trim());
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let ret = this.fillShortnameArrayFromIndexHTML(child);
                if (ret !== false) {
                    return ret;
                }
            }
        }
        return false;
    }

    public addDataset(id: string, content: string): Promise<string[]> {
        let roomsPromisesArray: Array<Promise<string>> = [];
        let indexHtmlString: string;
        this.shortnameArrayFromIndexHTML = [];
        this.insightData.numRows = 0;
        this.insightData.listOfRooms = [];

        let zip = new JSZip();

        return new Promise<string[]>((resolve, reject) => {

            return Promise.all([zip.loadAsync(content, { base64: true })]).then((z: JSZip[]) => {
                // read index.htm into a variable
                z[0].file("rooms/index.htm").async("text").then((htmlstring: string) => {
                    indexHtmlString = htmlstring;
                }).then(() => {
                    return this.parseHTML(indexHtmlString);
                }).then((htmlJSON: parse5.Document) => {
                    // Error: TypeError: Cannot read property 'fillShortnameArrayFromIndexHTML' of undefined
                    this.fillShortnameArrayFromIndexHTML(htmlJSON);
                });
                // read all the buildings into a promise string array
                z[0].folder("rooms").folder("campus").folder("discover").folder("buildings-and-classrooms")
                    .forEach(function (relativePath: string, file: JSZip.JSZipObject) {
                        // put the json string into each element of coursePromisesArray
                        if (this.fillShortnameArrayFromIndexHTML.includes(file.name)) {
                            roomsPromisesArray.push(file.async("text"));
                        }

                    });
                return Promise.all(roomsPromisesArray);
            }).then((resolvedRoomHtmls: string[]) => {
                if (!resolvedRoomHtmls.length) {
                    return reject(new InsightError("Empty or non-existant buildings-and-classrooms folder"));
                }


                // TODO Filter all the files in the buildings-and-classrooms by whats in index.htm

                // TODO parse room html for all the room info
                for (const htmlString of resolvedRoomHtmls) {
                    let doc = this.parseHTML(htmlString);
                }

                return reject(new InsightError("not implemented"));

            }).catch((err) => {
                return reject(new InsightError(err));
            });
        });
    }

}
