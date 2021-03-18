import JSZip = require("jszip");
import http = require("http");
import parse5 = require("parse5");
import AddDataset from "./AddDataset";
import { InsightData, InsightError, NotFoundError } from "./IInsightFacade";
import Log from "../Util";

export default class AddRoomDataset extends AddDataset {
    private filePathsFromHtmArray: string[];
    public insightData: InsightData;
    constructor(insData: InsightData) {
        super();
        this.filePathsFromHtmArray = [];
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

    public loadFilePathsFromHtm(htmlJSON: any) {
        // From: Noa's c2 video posted on piazza
        if (htmlJSON.nodeName === "a" && htmlJSON.attrs.length >= 2 &&
            htmlJSON.attrs[1].value === "Building Details and Map") {
            if (!this.filePathsFromHtmArray.includes(htmlJSON.attrs[0].value)) {
                let path = "rooms" + htmlJSON.attrs[0].value.replace(".", "");
                this.filePathsFromHtmArray.push(path);
            }
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                this.loadFilePathsFromHtm(child);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/tslint/config
    public addDataset(id: string, content: string): Promise<string[]> {
        let roomsPromisesArray: Array<Promise<string>> = [];
        this.filePathsFromHtmArray = [];
        this.insightData.numRows = 0;
        this.insightData.listOfRooms = [];

        let zip = new JSZip();

        // TODO: we currently have a list of all the raw HTMLs form all the buildings
        // we now need to
        // 1. parse through each one to find the necessary attributes like shortname, address, etc and
        //    store that in a RoomData object
        // 2. push that RoomData object to this.insightData.listOfRooms: RoomData[]
        // 3. put all the necessary information into a DetailedRoomDataset object, and write that to a json
        //    file on disk in the ./data folder, and call it id.json, where id is the id of the room.

        return new Promise<string[]>((resolve, reject) => {

            return (Promise.all([zip.loadAsync(content, { base64: true })])).then((z: JSZip[]) => {
                return z[0].file("rooms/index.htm").async("text").then((htmlstring: string) => {
                    return this.parseHTML(htmlstring);
                }).then((htmlJSON: any) => {
                    this.loadFilePathsFromHtm(htmlJSON);
                    // eslint-disable-next-line no-console
                    console.log(this.filePathsFromHtmArray);
                    return z;
                }).then((jsz: JSZip[]) => {
                    for (const path of this.filePathsFromHtmArray) {
                        roomsPromisesArray.push(jsz[0].file(path).async("text"));
                    }
                    return Promise.all(roomsPromisesArray);
                }).then(() => {
                    return;
                });
            }).then(() => {
                resolve(["not implemented"]);
            }).catch((err) => {
                reject(err);
            });
        });
    }

}
