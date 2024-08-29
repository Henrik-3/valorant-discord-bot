import {
    getDB,
    axios,
    randomize,
    getAgents,
    moment,
    riottoken,
    ComponentType,
    getTranslations,
    gamemodes,
    getFunction,
    maps,
    hdevtoken
} from '../methods.js';

export const patchStats = async function ({dbstats, mmatches, message, lang, agent, modes, bgcanvas} = {}) {
    const agents = getAgents();
    const translations = getTranslations();
    const buildStatsImage = getFunction('buildStatsImage');
    const reqs = [];
    if (!dbstats.stats) {
        dbstats.false;
        dbstats.last_update = Date.now();
        dbstats.agents = [];
        dbstats.matches = [];
        dbstats.stats = {};
    }
    !dbstats.ingamepuuid ? (mmatches.length = mmatches.length > 15 ? 15 : mmatches.length) : null;
    for (let i = 0; mmatches.length > i; i++) {
        reqs.push(
            dbstats.ingamepuuid
                ? axios.get(`https://api.henrikdev.xyz/valorant/v2/match/${mmatches[i].matchId}`, {timeout: 4000, headers: {Authorization: hdevtoken}}).catch(error => {
                      return error;
                  })
                : axios
                      .get(`https://${dbstats.region}.api.riotgames.com/val/match/v1/matches/${mmatches[i].matchId}`, {
                          headers: {'X-Riot-Token': riottoken},
                          timeout: 4000,
                      })
                      .catch(error => {
                          return error;
                      })
        );
    }
    let fmatches = await Promise.allSettled(reqs);
    fmatches = fmatches.map(item => {
        return item.value;
    });
    for (let i = 0; fmatches.length > i; i++) {
        if (!fmatches[i].response && (!fmatches.code || fmatches.code == 'ECONNABORTED')) {
            if (dbstats.ingamepuuid) {
                if (!fmatches[i].data) continue;
                if (fmatches[i].data.data.metadata.mode != 'Deathmatch') {
                    if (fmatches[i].data.data.metadata.mode != 'Custom Game') {
                        const player = fmatches[i].data.data.players.all_players.find(item => item.puuid == dbstats.ingamepuuid);
                        let team;
                        try {
                            team = fmatches[i].data.data.teams[player.team.toLowerCase()];
                        } catch (e) {
                            console.error(
                                dbstats.ingamepuuid,
                                dbstats.puuid,
                                fmatches[i].data.data.players.all_players.map(i => {
                                    return i.puuid;
                                }),
                                fmatches[i].data.data.metadata.matchid,
                                e
                            );
                        }
                        dbstats.stats.matches = !dbstats.stats?.matches ? 1 : dbstats.stats?.matches + 1;
                        dbstats.stats.kills = !isNaN(player.stats.kills) ? Number(player.stats.kills) + Number(dbstats.stats?.kills ? dbstats.stats?.kills : 0) : 0;
                        dbstats.stats.deaths = !isNaN(player.stats.deaths) ? Number(player.stats.deaths) + Number(dbstats.stats?.deaths ? dbstats.stats?.deaths : 0) : 0;
                        dbstats.stats.assists = !isNaN(player.stats.assists)
                            ? Number(player.stats.assists) + Number(dbstats.stats?.assists ? dbstats.stats?.assists : 0)
                            : 0;
                        dbstats.stats.headshots = !isNaN(player.stats.headshots)
                            ? Number(player.stats.headshots) + Number(dbstats.stats?.headshots ? dbstats.stats?.headshots : 0)
                            : 0;
                        let aces = 0;
                        let quadras = 0;
                        let triples = 0;
                        for (let j = 0; fmatches[i].data.data.rounds.length > j; j++) {
                            for (let k = 0; fmatches[i].data.data.rounds[j].player_stats.length > k; k++) {
                                if (fmatches[i].data.data.rounds[j].player_stats[k].player_puuid == dbstats.ingamepuuid) {
                                    if (fmatches[i].data.data.rounds[j].player_stats[k].kill_events.length == 3) triples += 1;
                                    if (fmatches[i].data.data.rounds[j].player_stats[k].kill_events.length == 4) quadras += 1;
                                    if (fmatches[i].data.data.rounds[j].player_stats[k].kill_events.length >= 5) aces += 1;
                                }
                            }
                        }
                        dbstats.stats.aces = Number(aces) + Number(dbstats.stats?.aces ? dbstats.stats?.aces : 0);
                        dbstats.stats.triples = Number(triples) + Number(dbstats.stats?.triples ? dbstats.stats?.triples : 0);
                        dbstats.stats.quadras = Number(quadras) + Number(dbstats.stats?.quadras ? dbstats.stats?.quadras : 0);
                        if (team.has_won) dbstats.stats.wins = !dbstats.stats?.wins ? 1 : dbstats.stats?.wins + 1;
                        if (!team.has_won) dbstats.stats.wins = !dbstats.stats?.wins ? 0 : dbstats.stats?.wins + 0;

                        const dbagent = dbstats.agents.find(item => item.agent == player.character);
                        const dbindex = dbstats.agents.findIndex(item => item.agent == player.character);
                        if (dbindex != -1) dbstats.agents.splice(dbindex, 1);
                        const agent = dbindex != -1 ? dbagent : {};
                        agent.agent = player.character;
                        agent.playtime = !isNaN(fmatches[i].data.data.metadata.game_length)
                            ? Number(agent.playtime ? agent.playtime : 0) + Number(fmatches[i].data.data.metadata.game_length * 1000)
                            : 0;
                        agent.matches = !agent.matches ? 1 : agent.matches + 1;
                        agent.kills = !isNaN(player.stats.kills) ? Number(agent.kills ? agent.kills : 0) + Number(player.stats.kills) : 0;
                        agent.deaths = !isNaN(player.stats.deaths) ? Number(agent.deaths ? agent.deaths : 0) + Number(player.stats.deaths) : 0;
                        agent.assists = !isNaN(player.stats.assists) ? Number(agent.assists ? agent.assists : 0) + Number(player.stats.assists) : 0;
                        agent.headshots = !isNaN(player.stats.headshots) ? Number(agent.headshots ? agent.headshots : 0) + Number(player.stats.headshots) : 0;
                        agent.aces = Number(agent.aces ? agent.aces : 0) + Number(aces);
                        agent.triples = Number(agent.triples ? agent.triples : 0) + Number(triples);
                        agent.quadras = Number(agent.quadras ? agent.quadras : 0) + Number(quadras);
                        if (team.has_won) agent.wins = !agent.wins ? 1 : agent.wins + 1;
                        if (!team.has_won) agent.wins = !agent.wins ? 0 : agent.wins + 0;
                        dbstats.agents.push(agent);

                        const dbcheck = await getDB('games').findOne({matchid: fmatches[i].data.data.metadata.matchid});
                        if (dbcheck)
                            dbstats.matches.push({
                                won: team.has_won,
                                gamekey: dbcheck.gamekey,
                                id: fmatches[i].data.data.metadata.matchid,
                                start: fmatches[i].data.data.metadata.game_start * 1000,
                                agent: player.character,
                                mode: fmatches[i].data.data.metadata.mode,
                                map: fmatches[i].data.data.metadata.map,
                                teamblue_won: team.has_won,
                                teamblue_rounds: team.rounds_won,
                                teamred_won: team.has_won == true ? false : true,
                                teamred_rounds: team.rounds_lost,
                                kills: player.stats.kills,
                                deaths: player.stats.deaths,
                                assists: player.stats.assists,
                            });
                        if (!dbcheck) {
                            let rid = randomize('Aa0', 8);
                            let available = false;

                            while (!available) {
                                const ridcheck = await getDB('games').findOne({gamekey: rid});
                                if (!ridcheck) {
                                    getDB('games').insertOne({gamekey: rid, matchid: fmatches[i].data.data.metadata.matchid, createdAt: new Date()});
                                    dbstats.matches.push({
                                        won: team.has_won,
                                        gamekey: rid,
                                        id: fmatches[i].data.data.metadata.matchid,
                                        start: fmatches[i].data.data.metadata.game_start * 1000,
                                        agent: player.character,
                                        mode: fmatches[i].data.data.metadata.mode,
                                        map: fmatches[i].data.data.metadata.map,
                                        teamblue_won: team.has_won,
                                        teamblue_rounds: team.rounds_won,
                                        teamred_won: team.has_won == true ? false : true,
                                        teamred_rounds: team.rounds_lost,
                                        kills: player.stats.kills,
                                        deaths: player.stats.deaths,
                                        assists: player.stats.assists,
                                    });
                                    available = true;
                                } else {
                                    rid = randomize('Aa0', 8);
                                }
                            }
                        }
                    }
                } else {
                    if (fmatches[i].data.data.metadata.mode != 'Custom Game') {
                        const player = fmatches[i].data.data.players.all_players.find(item => item.puuid == dbstats.ingamepuuid);
                        const team = fmatches[i].data.data.players.all_players.sort((item2, item1) => item2.score - item1.score)[0];
                        const dbcheck = await getDB('games').findOne({matchid: fmatches[i].data.data.metadata.matchid});
                        if (dbcheck)
                            dbstats.matches.push({
                                won: team.puuid == dbstats.ingamepuuid ? true : false,
                                gamekey: dbcheck.gamekey,
                                id: fmatches[i].data.data.metadata.matchid,
                                start: fmatches[i].data.data.metadata.game_start * 1000,
                                agent: player.character,
                                mode: fmatches[i].data.data.metadata.mode,
                                map: fmatches[i].data.data.metadata.map,
                                teamblue_won: team.puuid == dbstats.ingamepuuid ? true : false,
                                teamblue_rounds: team.puuid == dbstats.ingamepuuid ? 1 : 0,
                                teamred_won: team.puuid != dbstats.ingamepuuid ? true : false,
                                teamred_rounds: team.puuid != dbstats.ingamepuuid ? 1 : 0,
                                kills: player.stats.kills,
                                deaths: player.stats.deaths,
                                assists: player.stats.assists,
                            });
                        if (!dbcheck) {
                            let rid = randomize('Aa0', 8);
                            let available = false;

                            while (!available) {
                                const ridcheck = await getDB('games').findOne({gamekey: rid});
                                if (!ridcheck) {
                                    getDB('games').insertOne({gamekey: rid, matchid: fmatches[i].data.data.metadata.matchid, createdAt: new Date()});
                                    dbstats.matches.push({
                                        won: team.puuid == dbstats.ingamepuuid ? true : false,
                                        gamekey: rid,
                                        id: fmatches[i].data.data.metadata.matchid,
                                        start: fmatches[i].data.data.metadata.game_start * 1000,
                                        agent: player.character,
                                        mode: fmatches[i].data.data.metadata.mode,
                                        map: fmatches[i].data.data.metadata.map,
                                        teamblue_won: team.puuid == dbstats.ingamepuuid ? true : false,
                                        teamblue_rounds: team.puuid == dbstats.ingamepuuid ? 1 : 0,
                                        teamred_won: team.puuid != dbstats.ingamepuuid ? true : false,
                                        teamred_rounds: team.puuid != dbstats.ingamepuuid ? 1 : 0,
                                        kills: player.stats.kills,
                                        deaths: player.stats.deaths,
                                        assists: player.stats.assists,
                                    });
                                    available = true;
                                } else {
                                    rid = randomize('Aa0', 8);
                                }
                            }
                        }
                    }
                }
            }
            if (!dbstats.ingamepuuid) {
                if (fmatches[i].data.matchInfo.queueId != 'deathmatch') {
                    if (fmatches[i].data.matchInfo.queueId != '') {
                        const player = fmatches[i].data.players.find(item => item.puuid == dbstats.puuid);
                        const team = fmatches[i].data.teams.find(item => item.teamId == player.teamId);
                        dbstats.stats.matches = !dbstats.stats?.matches ? 1 : dbstats.stats?.matches + 1;
                        dbstats.stats.kills = !isNaN(player.stats.kills) ? Number(player.stats.kills) + Number(dbstats.stats?.kills ? dbstats.stats?.kills : 0) : 0;
                        dbstats.stats.deaths = !isNaN(player.stats.deaths) ? Number(player.stats.deaths) + Number(dbstats.stats?.deaths ? dbstats.stats?.deaths : 0) : 0;
                        dbstats.stats.assists = !isNaN(player.stats.assists)
                            ? Number(player.stats.assists) + Number(dbstats.stats?.assists ? dbstats.stats?.assists : 0)
                            : 0;
                        let headshots = 0;
                        let aces = 0;
                        let quadras = 0;
                        let triples = 0;
                        for (let j = 0; fmatches[i].data.roundResults.length > j; j++) {
                            for (let k = 0; fmatches[i].data.roundResults[j].playerStats.length > k; k++) {
                                if (fmatches[i].data.roundResults[j].playerStats[k].puuid == dbstats.puuid) {
                                    for (let f = 0; fmatches[i].data.roundResults[j].playerStats[k].damage.length > f; f++) {
                                        headshots += fmatches[i].data.roundResults[j].playerStats[k].damage[f].headshots;
                                    }
                                    if (fmatches[i].data.roundResults[j].playerStats[k].kills.length == 3) triples += 1;
                                    if (fmatches[i].data.roundResults[j].playerStats[k].kills.length == 4) quadras += 1;
                                    if (fmatches[i].data.roundResults[j].playerStats[k].kills.length >= 5) aces += 1;
                                }
                            }
                        }
                        dbstats.stats.headshots = !isNaN(player.stats.headshots)
                            ? Number(headshots) + Number(dbstats.stats?.headshots ? dbstats.stats?.headshots : 0)
                            : 0;
                        dbstats.stats.aces = Number(aces) + Number(dbstats.stats?.aces ? dbstats.stats?.aces : 0);
                        dbstats.stats.triples = Number(triples) + Number(dbstats.stats?.triples ? dbstats.stats?.triples : 0);
                        dbstats.stats.quadras = Number(quadras) + Number(dbstats.stats?.quadras ? dbstats.stats?.quadras : 0);
                        if (team.won) dbstats.stats.wins = !dbstats.stats?.wins ? 1 : dbstats.stats?.wins + 1;
                        if (!team.won) dbstats.stats.wins = !dbstats.stats?.wins ? 0 : dbstats.stats?.wins + 0;

                        const agentid = agents.find(item => item.uuid == player.characterId);
                        const dbagent = dbstats.agents.find(item => item.agent == agentid.displayName);
                        const dbindex = dbstats.agents.findIndex(item => item.agent == agentid.displayName);
                        if (dbindex != -1) dbstats.agents.splice(dbindex, 1);
                        const agent = dbindex != -1 ? dbagent : {};
                        agent.agent = agentid.displayName;
                        agent.playtime = !isNaN(fmatches[i].data.matchInfo.gameLengthMillis)
                            ? Number(agent.playtime ? agent.playtime : 0) + Number(fmatches[i].data.matchInfo.gameLengthMillis)
                            : 0;
                        agent.matches = !agent.matches ? 1 : agent.matches + 1;
                        agent.kills = !isNaN(player.stats.kills) ? Number(agent.kills ? agent.kills : 0) + Number(player.stats.kills) : 0;
                        agent.deaths = !isNaN(player.stats.deaths) ? Number(agent.deaths ? agent.deaths : 0) + Number(player.stats.deaths) : 0;
                        agent.assists = !isNaN(player.stats.assists) ? Number(agent.assists ? agent.assists : 0) + Number(player.stats.assists) : 0;
                        agent.headshots = !isNaN(player.stats.headshots) ? Number(agent.headshots ? agent.headshots : 0) + Number(player.stats.headshots) : 0;
                        agent.aces = Number(agent.aces ? agent.aces : 0) + Number(aces);
                        agent.triples = Number(agent.triples ? agent.triples : 0) + Number(triples);
                        agent.quadras = Number(agent.quadras ? agent.quadras : 0) + Number(quadras);
                        if (team.won) agent.wins = !agent.wins ? 1 : agent.wins + 1;
                        if (!team.won) agent.wins = !agent.wins ? 0 : agent.wins + 0;
                        dbstats.agents.push(agent);

                        const dbcheck = await getDB('games').findOne({matchid: fmatches[i].data.matchInfo.matchId});
                        if (dbcheck)
                            dbstats.matches.push({
                                won: team.won,
                                gamekey: dbcheck.gamekey,
                                id: fmatches[i].data.matchInfo.matchId,
                                start: fmatches[i].data.matchInfo.gameStartMillis,
                                agent: agentid.displayName,
                                mode: gamemodes[fmatches[i].data.matchInfo.queueId].name,
                                map: maps[fmatches[i].data.matchInfo.mapId],
                                teamblue_won: team.won,
                                teamblue_rounds: team.roundsWon,
                                teamred_won: !team.won,
                                teamred_rounds: team.roundsPlayed - team.roundsWon,
                                kills: player.stats.kills,
                                deaths: player.stats.deaths,
                                assists: player.stats.assists,
                            });
                        if (!dbcheck) {
                            let rid = randomize('Aa0', 8);
                            let available = false;

                            while (!available) {
                                const ridcheck = await getDB('games').findOne({gamekey: rid});
                                if (!ridcheck) {
                                    getDB('games').insertOne({gamekey: rid, matchid: fmatches[i].data.matchInfo.matchId, createdAt: new Date()});
                                    dbstats.matches.push({
                                        won: team.won,
                                        gamekey: rid,
                                        id: fmatches[i].data.matchInfo.matchId,
                                        start: fmatches[i].data.matchInfo.gameStartMillis,
                                        agent: agentid.displayName,
                                        mode: gamemodes[fmatches[i].data.matchInfo.queueId].name,
                                        map: maps[fmatches[i].data.matchInfo.mapId],
                                        teamblue_won: team.won,
                                        teamblue_rounds: team.roundsWon,
                                        teamred_won: !team.won,
                                        teamred_rounds: team.roundsPlayed - team.roundsWon,
                                        kills: player.stats.kills,
                                        deaths: player.stats.deaths,
                                        assists: player.stats.assists,
                                    });
                                    available = true;
                                } else {
                                    rid = randomize('Aa0', 8);
                                }
                            }
                        }
                    }
                } else {
                    if (fmatches[i].data.matchInfo.queueId != '') {
                        const player = fmatches[i].data.players.find(item => item.puuid == dbstats.puuid);
                        const agentid = agents.find(item => item.uuid == player.characterId);
                        const team = fmatches[i].data.teams.find(item => item.teamId == dbstats.puuid);

                        const dbcheck = await getDB('games').findOne({matchid: fmatches[i].data.matchInfo.matchId});
                        if (dbcheck)
                            dbstats.matches.push({
                                won: team.won,
                                gamekey: dbcheck.gamekey,
                                id: fmatches[i].data.matchInfo.matchId,
                                start: fmatches[i].data.matchInfo.gameStartMillis,
                                agent: agentid.displayName,
                                mode: gamemodes[fmatches[i].data.matchInfo.queueId].name,
                                map: maps[fmatches[i].data.matchInfo.mapId],
                                teamblue_won: team.won,
                                teamblue_rounds: team.roundsWon,
                                teamred_won: !team.won,
                                teamred_rounds: team.roundsPlayed - team.roundsWon,
                                kills: player.stats.kills,
                                deaths: player.stats.deaths,
                                assists: player.stats.assists,
                            });
                        if (!dbcheck) {
                            let rid = randomize('Aa0', 8);
                            let available = false;

                            while (!available) {
                                const ridcheck = await getDB('games').findOne({gamekey: rid});
                                if (!ridcheck) {
                                    getDB('games').insertOne({gamekey: rid, matchid: fmatches[i].data.matchInfo.matchId, createdAt: new Date()});
                                    dbstats.matches.push({
                                        won: team.won,
                                        gamekey: rid,
                                        id: fmatches[i].data.matchInfo.matchId,
                                        start: fmatches[i].data.matchInfo.gameStartMillis,
                                        agent: agentid.displayName,
                                        mode: gamemodes[fmatches[i].data.matchInfo.queueId].name,
                                        map: maps[fmatches[i].data.matchInfo.mapId],
                                        teamblue_won: team.won,
                                        teamblue_rounds: team.roundsWon,
                                        teamred_won: !team.won,
                                        teamred_rounds: team.roundsPlayed - team.roundsWon,
                                        kills: player.stats.kills,
                                        deaths: player.stats.deaths,
                                        assists: player.stats.assists,
                                    });
                                    available = true;
                                } else {
                                    rid = randomize('Aa0', 8);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if (!dbstats.region) dbstats.region = dbstats.region;
    dbstats.last_update = Date.now();
    const patchedmatches = dbstats.matches.filter(item => item != null).sort((match1, match2) => match2.start - match1.start);
    if (patchedmatches.length > 10) patchedmatches.length = 10;
    dbstats.matches = patchedmatches;
    await getDB('userstats').updateOne({puuid: dbstats.puuid}, {$set: dbstats}, {upsert: true});
    if (message) {
        const attachment = await buildStatsImage({dbstats, agent, modes, bgcanvas});
        const components = [];
        for (let i = 0; dbstats.matches.length > i; i++) {
            components.push({
                label: dbstats.matches[i].gamekey,
                value: dbstats.matches[i].id,
                description: `${dbstats.matches[i].map} | ${dbstats.matches[i].mode} | ${dbstats.matches[i].agent} | ${moment(dbstats.matches[i].start).format('lll')}`,
                emoji: Object.values(gamemodes).find(item => item.name == dbstats.matches[i].mode).emoji,
            });
        }
        message.edit({
            embeds: [],
            files: [attachment],
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.SelectMenu,
                            customId: `game`,
                            maxValues: 1,
                            minValues: 0,
                            options: [...new Set(components)],
                            placeholder: translations[lang].stats.game_select,
                        },
                    ],
                },
            ],
        });
    }
};
