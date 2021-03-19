import { InsightError } from "./IInsightFacade";

export default class GetBuildingRoomHelpers {
    public hasRooms(htmlJSON: any): boolean {
        // From: Noa's c2 video posted on piazza
        if (htmlJSON.nodeName === "th" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-number") {
            return true;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let ret = this.hasRooms(child);
                if (ret !== false) {
                    return ret;
                }
            }
        }
        return false;
    }

    public getBuildingFullName(htmlJSON: any): string {
        if (htmlJSON.childNodes[0].nodeName === "span"
            && htmlJSON.childNodes[0].attrs[0].value === "field-content") {
            return htmlJSON.childNodes[0].childNodes[0].value;
        }
        return null;
    }

    // TODO might wanna change this depending on expected behavior for missing addresses
    public getBuildingAddress(htmlJSON: any): string {
        try {
            return htmlJSON.childNodes[0].childNodes[0].value;
        } catch (err) {
            throw new InsightError("Unexpected html formatting encountered in getBuildingAddress");
        }
    }

    public getRoomHref(htmlJSON: any): string {
        if (htmlJSON.nodeName === "a" && htmlJSON.attrs[0].name === "href" && htmlJSON.attrs.length === 2
            && htmlJSON.attrs[1].value === "Room Details") {
            return htmlJSON.attrs[0].value;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let href = this.getRoomHref(child);
                if (href !== "") {
                    return href;
                }
            }
        }
        return "";
    }

    public getRoomSeats(htmlJSON: any): number {
        if (htmlJSON.nodeName === "td" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-capacity") {
            return htmlJSON.childNodes[0].value.trim();
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let cap = this.getRoomSeats(child);
                if (cap !== 0) {
                    return cap;
                }
            }
        }
        return 0;
    }

    public getRoomNumber(htmlJSON: any): string {
        if (htmlJSON.nodeName === "a" && htmlJSON.attrs[0].name === "href"
            && htmlJSON.attrs.length === 2
            && htmlJSON.attrs[1].value === "Room Details") {
            return htmlJSON.childNodes[0].value;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let roomNum = this.getRoomNumber(child);
                if (roomNum !== "") {
                    return roomNum;
                }
            }
        }
        return "";
    }

    public getRoomFurniture(htmlJSON: any): string {
        if (htmlJSON.nodeName === "td" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-furniture") {
            return htmlJSON.childNodes[0].value.trim();
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let furni = this.getRoomFurniture(child);
                if (furni !== "") {
                    return furni;
                }
            }
        }
        return "";
    }

    public getRoomType(htmlJSON: any): string {
        if (htmlJSON.nodeName === "td" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-type") {
            return htmlJSON.childNodes[0].value.trim();
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let rType = this.getRoomType(child);
                if (rType !== "") {
                    return rType;
                }
            }
        }
        return "";
    }

    public getShortName(htmlJSON: any): string {
        if (htmlJSON.nodeName === "link" && htmlJSON.attrs[0].value === "shortlink"
            && htmlJSON.attrs.length === 2
            && htmlJSON.attrs[1].name === "href") {
            return htmlJSON.attrs[1].value;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let srtNameRet = this.getShortName(child);
                if (srtNameRet !== "") {
                    return srtNameRet;
                }
            }
        }
        return "";
    }

}
