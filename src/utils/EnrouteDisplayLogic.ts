
import { EnrouteManager } from "./EnrouteManager";
import { enunciator } from "../components/enunciator";
import type { TripInformation } from "../components/types/TripInformation";

export interface EnrouteState {
    tripInfo: TripInformation | undefined;
    error: string | null;
    announcementTextChunk: string | null;
}

export class EnrouteDisplayLogic {
    private manager = new EnrouteManager();
    private chunkInterval: NodeJS.Timeout | null = null;
    private announcementTimeout: NodeJS.Timeout | null = null;

    async fetchTripInfo(
        chateau: string | null,
        trip: string | null,
        use24h: boolean,
        isPortrait: boolean,
        onAnnouncementUpdate?: (text: string | null) => void
    ): Promise<Partial<EnrouteState>> {
        try {
            if (!chateau || !trip) {
                throw new Error(
                    "Trip ID and Chateâu must be provided in the URL query parameters"
                );
            }

            const result = await this.manager.fetchTripInfo(
                chateau,
                trip,
                use24h,
                isPortrait
            );

            let announcementTextChunk = null;

            if (result.announcement) {
                announcementTextChunk = result.announcementText;
                enunciator.play(result.announcement);

                // Text ticker logic
                if (onAnnouncementUpdate) {
                    this.startTicker(result.announcement, onAnnouncementUpdate);
                }
            }

            return {
                tripInfo: result.tripInfo,
                error: null,
                announcementTextChunk
            };

        } catch (err: any) {
            return { error: err.message };
        }
    }

    // Refactored ticker logic to be controllable
    startTicker(
        announcement: any, // Use proper type if available
        onUpdate: (text: string | null) => void
    ) {
        if (this.announcementTimeout) clearTimeout(this.announcementTimeout);
        if (this.chunkInterval) clearInterval(this.chunkInterval);

        this.announcementTimeout = setTimeout(() => {
            if (announcement) {
                let chunks = announcement.text.match(/.{1,53}/g);

                if (chunks) {
                    let nextChunk = chunks.shift();
                    if (nextChunk) onUpdate(nextChunk);

                    this.chunkInterval = setInterval(() => {
                        if (chunks && chunks.length > 0) {
                            let nextChunk = chunks.shift();
                            if (nextChunk) onUpdate(nextChunk);
                        } else {
                            if (this.chunkInterval) clearInterval(this.chunkInterval);
                            onUpdate(null);
                        }
                    }, 3500);
                }
            }
        }, 1600);
    }

    cleanup() {
        if (this.announcementTimeout) clearTimeout(this.announcementTimeout);
        if (this.chunkInterval) clearInterval(this.chunkInterval);
    }
}
