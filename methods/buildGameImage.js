import {
    axios,
    embedBuilder,
    ranks,
    old_ranks,
    moment,
    Canvas,
    getTranslations,
    getAgents,
    AttachmentBuilder,
    gamemodes,
    hdevtoken
} from '../methods.js';
import {getGameKey} from './getGameKey.js';
import {buildText} from './buildText.js';

export const buildGameImage = async function ({id, guilddata, matchid, bgcanvas} = {}) {
    const translations = getTranslations();
    const gamekey = matchid ? true : await getGameKey(id);
    if (!gamekey) return {error: null, unknown: true, embed: null, image: null};
    const match = await axios.get(`https://api.henrikdev.xyz/valorant/v2/match/${matchid ?? gamekey.matchid}`, {headers: {Authorization: hdevtoken}}).catch(error => {
        return error;
    });
    if (match.response) return {error: match.response, unknown: null, embed: null, image: null};
    switch (match.data.data.metadata.mode) {
        case 'Deathmatch':
            const fields = [];
            const sorted_array = match.data.data.players.all_players.sort((player2, player1) => player2.stats.score - player1.stats.score);
            for (let i = 0; sorted_array.length > i; i++) {
                const rank = await axios.get(`https://api.henrikdev.xyz/valorant/v1/by-puuid/mmr/eu/${sorted_array[i].puuid}`, {headers: {Authorization: hdevtoken}}).catch(error => {
                    return error;
                });
                fields.push({
                    name: `${sorted_array[i].name}#${sorted_array[i].tag}`,
                    value: `${
                        rank.response != null || rank.data.data.currenttier == null
                            ? ranks[0].discordid
                            : (rank.data.data.old ? old_ranks[rank.data.data.currenttier] : ranks[rank.data.data.currenttier]).discordid
                    } | Score: ${sorted_array[i].stats.score} | KDA: ${sorted_array[i].stats.kills}/${sorted_array[i].stats.deaths}/${sorted_array[i].stats.assists}`,
                });
            }
            return {
                error: null,
                unknown: null,
                embed: [
                    embedBuilder({
                        title: `Game ${id ?? ''} | ID: ${match.data.data.metadata.matchid}`,
                        desc: `Mode: Deathmatch | Map: ${match.data.data.metadata.map} | Length: ${moment
                            .duration(match.data.data.metadata.game_length, 'seconds')
                            .minutes()}m ${moment.duration(match.data.data.metadata.game_length, 'seconds').seconds()}s | Started at: ${moment(
                            match.data.data.metadata.game_start * 1000
                        ).format('LLLL')}`,
                        thumbnail: 'https://media.valorant-api.com/gamemodes/a8790ec5-4237-f2f0-e93b-08a8e89865b2/displayicon.png',
                        additionalFields: fields.reverse(),
                        footer: 'VALORANT LABS [GAME]',
                    }),
                ],
                image: null,
            };
        default:
            const canvas = Canvas.createCanvas(3840, 2160);
            const ctx = canvas.getContext('2d');
            const background = bgcanvas ? bgcanvas : await Canvas.loadImage('assets/background/VALORANT_game.png');
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            moment.locale(translations[guilddata.lang].moment);
            const mode_image = await Canvas.loadImage(`./assets/modes/${Object.values(gamemodes).find(item => item.name == match.data.data.metadata.mode).path}`);
            ctx.drawImage(mode_image, 550, 975, 250, 250);
            buildText({
                ctx,
                text: `${match.data.data.metadata.mode} | ${match.data.data.metadata.map} | ${match.data.data.metadata.cluster} | ${
                    match.data.data.metadata.game_version.split('-')[0]
                } -${match.data.data.metadata.game_version.split('-')[1]}`,
                size: 100,
                x: 950,
                y: 1075,
            });
            buildText({
                ctx,
                text: `${moment.duration(match.data.data.metadata.game_length, 'seconds').minutes()}m ${moment
                    .duration(match.data.data.metadata.game_length, 'seconds')
                    .seconds()}s | ${moment(match.data.data.metadata.game_start * 1000).format('LLLL')}`,
                size: 100,
                x: 950,
                y: 1200,
                color: '#ffffff',
            });
            const red_players = match.data.data.players.red.sort((player2, player1) => player1.stats.score - player2.stats.score);
            const blue_players = match.data.data.players.blue.sort((player2, player1) => player1.stats.score - player2.stats.score);
            buildText({ctx, text: match.data.data.teams.blue.rounds_won, size: 90, x: 3450, y: 1050, color: '#00ffff', align: 'right'});
            buildText({ctx, text: match.data.data.teams.red.rounds_won, size: 90, x: 3450, y: 1200, color: '#ff4654', align: 'right'});
            let x_blue_name = 390;
            let x_blue_level = 382;
            let x_blue_score = 370;
            let x_blue_kills = 590;
            let x_blue_kd = 110;
            let x_blue_rank = 600;
            let x_blue_agent = 185;
            let x_red_name = 390;
            let x_red_level = 382;
            let x_red_score = 370;
            let x_red_kills = 590;
            let x_red_kd = 110;
            let x_red_rank = 600;
            let x_red_agent = 185;
            for (let i = 0; red_players.length > i; i++) {
                const player = await Canvas.loadImage(
                    `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${red_players[i].currenttier}/largeicon.png`
                );
                ctx.drawImage(player, x_red_rank, 1320, 75, 75);
                const agent = await Canvas.loadImage(
                    getAgents().find(item => item.displayName.toLowerCase() == red_players[i].character.toLowerCase()).fullPortraitV2 ??
                        getAgents().find(item => item.displayName.toLowerCase() == red_players[i].character.toLowerCase()).fullPortrait
                );
                ctx.drawImage(agent, x_red_agent, 1480, 405, 405);
                buildText({ctx, text: `${red_players[i].name} #${red_players[i].tag}`, size: 40, x: x_red_name, y: 1450, color: '#fff', align: 'center'});
                buildText({ctx, text: red_players[i].stats.score, size: 60, x: x_red_score, y: 2025, color: '#fff', align: 'center'});
                buildText({ctx, text: red_players[i].stats.kills, size: 60, x: x_red_kills, y: 2025, color: '#fff', align: 'center'});
                buildText({
                    ctx,
                    text: (red_players[i].stats.kills / red_players[i].stats.deaths).toFixed(2),
                    size: 60,
                    x: x_red_kd,
                    y: 2025,
                    color: '#fff',
                    align: 'left',
                });
                buildText({ctx, text: red_players[i].level, size: 30, x: x_red_level, y: 1385, color: '#fff', align: 'center'});
                x_red_rank += 768;
                x_red_name += 768;
                x_red_score += 768;
                x_red_kills += 768;
                x_red_kd += 768;
                x_red_level += 768;
                x_red_agent += 768;
            }
            for (let i = 0; blue_players.length > i; i++) {
                const player = await Canvas.loadImage(
                    `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${blue_players[i].currenttier}/largeicon.png`
                );
                ctx.drawImage(player, x_blue_rank, 110, 75, 75);
                const agent = await Canvas.loadImage(
                    getAgents().find(item => item.displayName.toLowerCase() == blue_players[i].character.toLowerCase()).fullPortraitV2 ??
                        getAgents().find(item => item.displayName.toLowerCase() == blue_players[i].character.toLowerCase()).fullPortrait
                );
                ctx.drawImage(agent, x_blue_agent, 270, 405, 405);
                buildText({ctx, text: `${blue_players[i].name} #${blue_players[i].tag}`, size: 40, x: x_blue_name, y: 240, color: '#fff', align: 'center'});
                buildText({ctx, text: blue_players[i].stats.score, size: 60, x: x_blue_score, y: 815, color: '#fff', align: 'center'});
                buildText({ctx, text: blue_players[i].stats.kills, size: 60, x: x_blue_kills, y: 815, color: '#fff', align: 'center'});
                buildText({
                    ctx,
                    text: (blue_players[i].stats.kills / blue_players[i].stats.deaths).toFixed(2),
                    size: 60,
                    x: x_blue_kd,
                    y: 815,
                    color: '#fff',
                    align: 'left',
                });
                buildText({ctx, text: blue_players[i].level, size: 30, x: x_blue_level, y: 170, color: '#fff', align: 'center'});
                x_blue_rank += 768;
                x_blue_name += 768;
                x_blue_score += 768;
                x_blue_kills += 768;
                x_blue_kd += 768;
                x_blue_level += 768;
                x_blue_agent += 768;
            }
            const attachment = new AttachmentBuilder(canvas.toBuffer(), `valorant-game.png`, {description: 'VALORANT LABS Game'});
            return {error: null, unknown: null, embed: null, image: attachment};
    }
};
