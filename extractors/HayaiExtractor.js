const { BaseExtractor, Track, Playlist } = require('discord-player');

class HayaiExtractor extends BaseExtractor {
    static identifier = 'HayaiExtractor';

    async validate(query, type) {
        // We only want to handle Hayai music, so we just accept all text queries.
        // We can restrict it to strings.
        return typeof query === 'string' && query.length > 0;
    }

    async handle(query, context) {
        const apiKey = process.env.HAYAI_MUSIC_API_KEY;
        if (!apiKey) throw new Error("HAYAI_MUSIC_API_KEY is not defined in .env");

        let tracksData = [];
        
        // If the query looks like an exact track ID
        if (query.startsWith('trk_')) {
            const res = await fetch(`https://music.hayai.tech/api/v1/tracks/${query}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const json = await res.json();
            if (json.success && json.data) {
                tracksData.push(json.data);
            }
        } else {
            // Otherwise, perform a search
            const res = await fetch(`https://music.hayai.tech/api/v1/search?q=${encodeURIComponent(query)}&limit=10`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const json = await res.json();
            if (json.success && json.data && json.data.tracks) {
                tracksData = json.data.tracks;
            }
        }

        if (!tracksData.length) return this.createResponse(null, []);

        const tracks = tracksData.map(t => {
            return new Track(this.context.player, {
                title: t.title,
                description: t.mood ? `${t.genre} - ${t.mood}` : (t.genre || ''),
                author: t.artist || 'Hayai AI',
                url: `https://music.hayai.tech/tracks/${t.id}`, // Full URL for embeds
                thumbnail: t.cover_url || 'https://images.unsplash.com/photo-1614113489855-66422ad300a4?w=500&q=80',
                duration: this._formatDuration(t.duration_secs || 0),
                views: t.plays || 0,
                requestedBy: context.requestedBy,
                source: 'arbitrary',
                queryType: 'hayai'
            });
        });

        return this.createResponse(null, tracks);
    }

    async stream(info) {
        const apiKey = process.env.HAYAI_MUSIC_API_KEY;
        if (!apiKey) throw new Error("HAYAI_MUSIC_API_KEY is not defined in .env");

        // Extract the track ID from the fake URL we constructed
        const trackId = info.url.split('/').pop();
        
        const res = await fetch(`https://music.hayai.tech/api/v1/tracks/${trackId}/stream`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const json = await res.json();
        
        if (!json.success || !json.data || !json.data.stream_url) {
            throw new Error(`Failed to extract stream for Hayai track ${trackId}: ${json.error?.message || 'Unknown error'}`);
        }

        return json.data.stream_url;
    }

    _formatDuration(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

module.exports = HayaiExtractor;
