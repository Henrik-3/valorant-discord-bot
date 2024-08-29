import {Canvas, axios, moment, AttachmentBuilder, hdevtoken} from '../methods.js';
import {buildText} from './buildText.js';

export const buildStatsImage = async function ({dbstats, agent, modes, bgcanvas} = {}) {
    const canvas = Canvas.createCanvas(3840, 2160);
    const ctx = canvas.getContext('2d');
    const background = bgcanvas ? bgcanvas : await Canvas.loadImage('assets/background/VALORANT_stats.png');
    const gradient = ctx.createLinearGradient(0, 0, 200, 0);
    gradient.addColorStop(0, '#D60808');
    gradient.addColorStop(1, '#FF6690');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    const rank = dbstats.ingamepuuid
        ? await axios.get(`https://api.henrikdev.xyz/valorant/v1/by-puuid/mmr/${dbstats.region}/${dbstats.ingamepuuid}`, {headers: {Authorization: hdevtoken}}).catch(error => {
              return error;
          })
        : null;
    let rank_image;
    if (rank == null || rank.response || (rank.data && rank.data.data.currenttier == null)) {
        rank_image = await Canvas.loadImage('https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/0/largeicon.png');
    } else {
        rank_image = await Canvas.loadImage(
            `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${rank.data.data.currenttier}/largeicon.png`
        );
        buildText({
            ctx,
            text: rank.data.data.mmr_change_to_last_game > 0 ? `+${rank.data.data.mmr_change_to_last_game}` : rank.data.data.mmr_change_to_last_game,
            size: 50,
            x: 1200,
            y: 820,
        });
        buildText({
            ctx,
            text: rank.data.data.elo,
            size: 75,
            x: 1085,
            y: 575,
        });
    }

    ctx.drawImage(rank_image, 1075, 600, 200, 200);
    buildText({ctx, text: `${dbstats.name}#${dbstats.tag}`, size: 130, x: 1920, y: 255, color: gradient, align: 'center'});
    buildText({ctx, text: dbstats.stats?.kills, size: 80, x: 405, y: 610, color: '#ff4654'});
    buildText({ctx, text: dbstats.stats?.deaths, size: 80, x: 460, y: 740, color: '#ff4654'});
    buildText({ctx, text: dbstats.stats?.assists, size: 80, x: 490, y: 872, color: '#ff4654'});
    buildText({ctx, text: (dbstats.stats?.kills / dbstats.stats?.deaths).toFixed(2), size: 80, x: 330, y: 1005, color: '#ff4654'});
    buildText({ctx, text: ((dbstats.stats?.kills + dbstats.stats?.assists) / dbstats.stats?.deaths).toFixed(2), size: 80, x: 420, y: 1135, color: '#ff4654'});

    const est = dbstats.stats?.matches * (35 * 60000);
    buildText({ctx, text: dbstats.stats?.matches, size: 80, x: 1750, y: 610, color: '#ff4654'});
    buildText({ctx, text: dbstats.stats?.wins, size: 80, x: 1600, y: 740, color: '#ff4654'});
    buildText({ctx, text: `${((dbstats.stats?.wins / dbstats.stats?.matches) * 100).toFixed(2)}%`, size: 80, x: 1650, y: 872, color: '#ff4654'});
    buildText({ctx, text: dbstats.stats?.aces, size: 80, x: 1600, y: 1005, color: '#ff4654'});
    buildText({
        ctx,
        text: `${moment.duration(est).days()}D ${moment.duration(est).hours()}H ${moment.duration(est).minutes()}M ${moment.duration(est).seconds()}S`,
        size: 80,
        x: 1375,
        y: 1150,
        color: '#00ffff',
        align: 'left',
    });

    const best_agent = dbstats.agents.filter(item => item.agent && item.agent != '').sort((agent1, agent2) => agent2.playtime - agent1.playtime)[0];
    if (best_agent) {
        if (!agent.response && best_agent) {
            const a_img = await Canvas.loadImage(agent.find(item => item.displayName.toLowerCase() == best_agent.agent.toLowerCase()).fullPortrait);
            ctx.drawImage(a_img, 2475, 475, 725, 725);
            buildText({ctx, text: (best_agent.kills / best_agent.deaths).toFixed(2), size: 80, x: 3535, y: 690, align: 'center', color: '#ff4654'});
            buildText({ctx, text: best_agent.matches, size: 80, x: 3535, y: 865, align: 'center', color: '#ff4654'});
            buildText({ctx, text: best_agent.wins, size: 80, x: 3540, y: 1040, align: 'center', color: '#ff4654'});
            buildText({
                ctx,
                text: `${moment.duration(best_agent.playtime).days()}D ${moment.duration(best_agent.playtime).hours()}H ${moment
                    .duration(best_agent.playtime)
                    .minutes()}M ${moment.duration(best_agent.playtime).seconds()}S`,
                size: 80,
                x: 3125,
                y: 1150,
                color: '#00ffff',
            });
        }
    }

    const mapk = [1390, 1657.5, 1922.5];
    const modek = [1502.5, 1768, 2035];
    const modeimgk = [1425, 1690, 1958];
    const agentimgk = [1310, 1576.6, 1842];
    let keyk = 1425;
    const matches = Array.from(dbstats.matches);
    matches.length = matches.length >= 3 ? 3 : matches.length;
    for (let i = 0; matches.length > i; i++) {
        buildText({ctx, text: matches[i].map, size: 110, x: 825, y: mapk[i]});
        buildText({ctx, text: matches[i].mode, size: 90, x: 825, y: modek[i]});
        const mode_data = modes.find(
            item => item.displayName.toLowerCase() == (matches[i].mode == 'Competitive' || matches[i].mode == 'Unrated' ? 'Standard' : matches[i].mode).toLowerCase()
        );
        if (mode_data) {
            const mode_img = await Canvas.loadImage(mode_data.displayIcon);
            ctx.drawImage(mode_img, 700, modeimgk[i], 100, 100);
        }
        if (matches[i].agent) {
            const agent_img = await Canvas.loadImage(agent.find(item => item.displayName.toLowerCase() == matches[i].agent.toLowerCase()).displayIcon);
            ctx.drawImage(agent_img, 700, agentimgk[i], 100, 100);
        }
        buildText({ctx, text: 'Score', size: 110, x: 1525, y: mapk[i]});
        buildText({ctx, text: matches[i].teamblue_rounds, size: 90, x: 1595, y: modek[i], color: '#0088ff', align: 'center'});
        buildText({ctx, text: ':', size: 90, x: 1675, y: modek[i], align: 'center'});
        buildText({ctx, text: matches[i].teamred_rounds, size: 90, x: 1750, y: modek[i], color: '#ff4654', align: 'center'});
        buildText({ctx, text: 'K/D/A', size: 110, x: 2050, y: mapk[i]});
        buildText({ctx, text: `${matches[i].kills}/${matches[i].deaths}/${matches[i].assists}`, size: 90, x: 2200, y: modek[i], align: 'center'});
        buildText({ctx, text: `/game ${matches[i].gamekey}`, size: 80, x: 2500, y: keyk});
        keyk += 266.6;
    }
    return new AttachmentBuilder(canvas.toBuffer(), `valorant-stats-${dbstats.name}-${dbstats.tag}.png`, {description: 'VALORANT LABS Stats'});
};
