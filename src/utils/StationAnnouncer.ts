import { enunciator } from "../components/enunciator";
import { EnunciatorState, type EnunciatorMessage } from "../components/types/Enunciator";
import type { Arrival } from "../components/types/StationInformation";

export class StationAnnouncer {
    private announcementActive = false;
    private onTextChunkChange: (chunk: string | null) => void;

    constructor(onTextChunkChange: (chunk: string | null) => void) {
        this.onTextChunkChange = onTextChunkChange;
    }

    async announce(region: string, arrival?: Arrival) {
        let voicedAnnouncement: EnunciatorMessage | null;
        if (arrival) {
            voicedAnnouncement = await enunciator.sync(
                region,
                EnunciatorState.STATION,
                arrival,
                null,
            );
        } else {
            voicedAnnouncement = await enunciator.sync(
                region,
                EnunciatorState.STATION,
                null,
                null,
            );
        }

        if (voicedAnnouncement) {
            if (this.announcementActive) {
                // Retry logic if busy
                const reCheckForAnnouncement = setInterval(() => {
                    if (!this.announcementActive) {
                        clearInterval(reCheckForAnnouncement);
                        if (arrival) {
                            this.announce(region, arrival);
                        } else {
                            setTimeout(() => this.announce(region), 3000);
                        }
                    }
                }, 2000);
            } else {
                this.announcementActive = true;
                this.onTextChunkChange("[MSG]");

                setTimeout(() => {
                    if (voicedAnnouncement) {
                        const chunks = voicedAnnouncement.text.match(/.{1,53}/g);
                        if (chunks) {
                            let nextChunk = chunks.shift();
                            if (nextChunk) this.onTextChunkChange(nextChunk);

                            const chunkInterval = setInterval(() => {
                                if (chunks && chunks.length > 0) {
                                    let nextChunk = chunks.shift();
                                    if (nextChunk)
                                        this.onTextChunkChange(nextChunk);
                                } else {
                                    if (!this.announcementActive) {
                                        clearInterval(chunkInterval);
                                        this.onTextChunkChange(null);
                                    }
                                }
                            }, 3500);
                        }
                    }
                }, 1600);

                enunciator.play(voicedAnnouncement).then(() => {
                    this.announcementActive = false;
                });
            }
        }
    }
}
