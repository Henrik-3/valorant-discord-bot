import {getFunction, getDB, axios, basedata, getManager, getAgents, getGamemodes, addRSO, updateRSO, deleteRSO, _} from '../shard.js';
import {hdevtoken} from "../methods.js";

export const steps = {
    delete: [
        {step: 0, name: 'FETCH_TOKENS'},
        {step: 1, name: 'FETCH_USERINFO'},
        {step: 2, name: 'DELETE_RSO_DB'},
        {step: 3, name: 'DELETE_STATE_DB'},
        {step: 4, name: 'DONE'},
    ],
    autorole: [
        {step: 0, name: 'FETCH_TOKENS'},
        {step: 1, name: 'FETCH_USERINFO'},
        {step: 2, name: 'FETCH_REGION'},
        {step: 3, name: 'FETCH_ACCOUNT'},
        {step: 4, name: 'FETCH_MMR'},
        {step: 5, name: 'APPLY_ROLE'},
        {step: 6, name: 'SET_RSO_DB'},
        {step: 7, name: 'SET_LINK_DB'},
        {step: 8, name: 'WRITING_LOGS'},
        {step: 9, name: 'DELETE_STATE_DB'},
        {step: 10, name: 'DONE'},
    ],
    link: [
        {step: 0, name: 'FETCH_TOKENS'},
        {step: 1, name: 'FETCH_USERINFO'},
        {step: 2, name: 'FETCH_REGION'},
        {step: 3, name: 'FETCH_ACCOUNT'},
        {step: 4, name: 'SET_RSO_DB'},
        {step: 5, name: 'SET_LINK_DB'},
        {step: 6, name: 'WRITING_LOGS'},
        {step: 7, name: 'DELETE_STATE_DB'},
        {step: 8, name: 'DONE'},
    ],
    stats: [
        {step: 0, name: 'FETCH_TOKENS'},
        {step: 1, name: 'FETCH_USERINFO'},
        {step: 2, name: 'FETCH_REGION'},
        {step: 3, name: 'FETCH_ACCOUNT'},
        {step: 4, name: 'FETCH_MATCH_HISTORY'},
        {step: 5, name: 'PATCHING_STATS'},
        {step: 6, name: 'SET_RSO_DB'},
        {step: 7, name: 'SET_LINK_DB'},
        {step: 8, name: 'WRITING_LOGS'},
        {step: 9, name: 'DELETE_STATE_DB'},
        {step: 10, name: 'DONE'},
    ],
};

const stepUpdate = async (socket, data, uuid) => {
    await socket.emit('STEP_UPDATE', data);
    updateRSO(uuid, data);
    return;
};

export default async function (fastify, opts, done) {
    const getClient = rso => {
        const clients = [...fastify.io.sockets.sockets].map(([name, value]) => value);
        return clients.find(i => i.handshake.query.rso == rso)?.id ?? null;
    };
    fastify.get('/oauth-finished.html', async (req, res) => {
        const patchStats = getFunction('patchStats');
        const manager = getManager();
        if (!req.query.state) return res.redirect(`/rso?uuid=null`);
        const fstate = await getDB('state').findOne({code: req.query.state});
        addRSO(req.query.state, fstate?.type ?? 'stats', steps[fstate?.type ?? 'stats']);
        res.redirect(`/rso?uuid=${req.query.state ?? null}`);
        if (!fstate) return fastify.io.to(getClient(req.query.state)).emit('UNKNOWN_STATE', {unknown_state: true});

        const formData = new URLSearchParams();
        formData.append('grant_type', 'authorization_code');
        formData.append('code', req.query.code);
        formData.append('redirect_uri', 'https://valorantlabs.xyz/oauth-finished.html');
        const tokens = await axios
            .post('https://auth.riotgames.com/token', formData, {
                headers: {Authorization: `Basic ${Buffer.from(basedata.client_secret).toString('base64')}`},
            })
            .catch(e => e);
        await stepUpdate(
            fastify.io.to(getClient(req.query.state)),
            {
                ...steps[fstate.type][0],
                done: true,
                success: tokens.response || tokens.code ? false : true,
                value: tokens.response?.data ??
                    tokens.code ?? {
                        scope: tokens.data.scope,
                        expires_in: tokens.data.expires_in,
                        token_type: tokens.data.token_type,
                        refresh_token: _.truncate(tokens.data.refresh_token, {length: 10}),
                        access_token: _.truncate(tokens.data.access_token, {length: 10}),
                    },
            },
            req.query.state
        );
        if (tokens.response) return deleteRSO(req.query.state);
        const userinfo = await axios
            .get('https://americas.api.riotgames.com/riot/account/v1/accounts/me', {
                headers: {Authorization: `Bearer ${tokens.data.access_token}`},
            })
            .catch(e => e);
        await stepUpdate(
            fastify.io.to(getClient(req.query.state)),
            {
                ...steps[fstate.type][1],
                done: true,
                success: userinfo.response || userinfo.code ? false : true,
                value: userinfo.response?.data ?? userinfo.code ?? userinfo.data,
            },
            req.query.state
        );
        if (userinfo.response) return deleteRSO(req.query.state);
        if (fstate.type == 'delete') {
            getDB('rso').deleteMany({puuid: userinfo.data.puuid});
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][2],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            getDB('state').deleteOne({code: req.query.state});
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][3],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][4],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            deleteRSO(req.query.state);
            return;
        }
        const region = await axios
            .get(`https://americas.api.riotgames.com/riot/account/v1/active-shards/by-game/val/by-puuid/${userinfo.data.puuid}`, {
                headers: {'X-Riot-Token': basedata.riottoken},
            })
            .catch(e => e);
        await stepUpdate(
            fastify.io.to(getClient(req.query.state)),
            {
                ...steps[fstate.type][2],
                done: true,
                success: region.response || region.code ? false : true,
                value: region.response?.data ?? region.code ?? region.data,
            },
            req.query.state
        );
        if (region.response) return deleteRSO(req.query.state);
        const db = await axios
            .get(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURI(userinfo.data.gameName)}/${encodeURI(userinfo.data.tagLine)}`, {headers: {Authorization: hdevtoken}})
            .catch(e => e);
        await stepUpdate(
            fastify.io.to(getClient(req.query.state)),
            {
                ...steps[fstate.type][3],
                done: true,
                success: db.response || db.code ? false : true,
                value: db.response?.data ?? db.code ?? db.data,
            },
            req.query.state
        );
        if (db.response) return deleteRSO(req.query.state);
        if (fstate.type == 'autorole') {
            const guilddata = await getDB('settings').findOne({gid: fstate.guild});
            const mmr = await axios.get(`https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/${region.data.activeShard}/${db.data.data.puuid}`, {headers: {Authorization: hdevtoken}}).catch(e => e);
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][4],
                    done: true,
                    success: mmr.response || mmr.code ? false : true,
                    value: mmr.response?.data ?? mmr.code ?? mmr.data,
                },
                req.query.state
            );
            if (mmr.response) return deleteRSO(req.query.state);
            if (mmr.data.data.current_data.currenttier == null || mmr.data.data.current_data.games_needed_for_rating != 0) {
                if (guilddata.autoroles.some(i => i.name == 'unranked')) {
                    await manager.broadcastEval(
                        async (c, {user, guild, ra, rm}) => {
                            if (c.guilds.cache.has(guild)) {
                                const member = await c.guilds.cache
                                    .get(guild)
                                    .members.fetch(user)
                                    .catch(e => {
                                        console.log(e);
                                    });
                                await member?.roles?.remove(rm).catch(e => {
                                    console.log(e);
                                });
                                await member?.roles?.add(ra).catch(e => {
                                    console.log(e);
                                });
                            }
                        },
                        {
                            context: {
                                user: fstate.userid,
                                guild: fstate.guild,
                                ra: guilddata.autoroles.find(i => i.name == 'unranked').id,
                                rm: guilddata.autoroles.filter(i => i.name != 'unranked').map(i => i.id),
                            },
                        }
                    );
                }
                await stepUpdate(
                    fastify.io.to(getClient(req.query.state)),
                    {
                        ...steps[fstate.type][5],
                        done: true,
                        success: false,
                        value: 'Unranked',
                    },
                    req.query.state
                );
                return deleteRSO(req.query.state);
            }
            if (!guilddata.autoroles.some(item => mmr.data.data.current_data.currenttierpatched.split(' ')[0].toLowerCase() == item.name)) {
                await stepUpdate(
                    fastify.io.to(getClient(req.query.state)),
                    {
                        ...steps[fstate.type][5],
                        done: true,
                        success: false,
                        value: "The rank you have isn't configured yet, please ask the owner or admin of the server to reconfigure/resend the autorole system",
                    },
                    req.query.state
                );
                return deleteRSO(req.query.state);
            }
            await manager
                .broadcastEval(
                    async (c, {user, guild, ra, rm}) => {
                        if (c.guilds.cache.has(guild)) {
                            const member = await c.guilds.cache
                                .get(guild)
                                .members.fetch(user)
                                .catch(e => {
                                    console.log(e);
                                });
                            await member.roles.remove(rm).catch(e => {
                                console.log(e);
                            });
                            await member.roles.add(ra).catch(e => {
                                console.log(e);
                            });
                        }
                    },
                    {
                        context: {
                            user: fstate.userid,
                            guild: fstate.guild,
                            ra: guilddata.autoroles.find(item => mmr.data.data.current_data.currenttierpatched.split(' ')[0].toLowerCase() == item.name).id,
                            rm: guilddata.autoroles
                                .filter(item => mmr.data.data.current_data.currenttierpatched.split(' ')[0].toLowerCase() != item.name)
                                .map(item => {
                                    return item.id;
                                }),
                        },
                    }
                )
                .catch(async e => {
                    await manager.broadcastEval(
                        (c, {embed}) => {
                            if (c.channels.cache.has('992792200918347876')) return c.channels.cache.get('992792200918347876').send({embeds: [embed]});
                        },
                        {
                            context: {
                                embed: {
                                    title: 'Error',
                                    description: `\`\`\`${JSON.stringify(e)}\`\`\``,
                                    color: 16777215,
                                },
                            },
                        }
                    );
                });
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][5],
                    done: true,
                    success: true,
                    value: `${mmr.data?.data?.current_data?.currenttierpatched} (Elo: ${mmr.data?.data?.current_data?.elo})`,
                },
                req.query.state
            );
            await getDB('rso').updateOne({puuid: userinfo.data.puuid}, {$set: {puuid: userinfo.data.puuid}}, {upsert: true});
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][6],
                    done: true,
                    success: true,
                    value: {puuid: userinfo.data.puuid},
                },
                req.query.state
            );
            getDB('linkv2').updateOne(
                {userid: fstate.userid},
                {$set: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard}},
                {upsert: true}
            );
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][7],
                    done: true,
                    success: true,
                    value: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard},
                },
                req.query.state
            );
            const log_data = {
                userid: fstate.userid,
                date: new Date(),
                admin: null,
                guild: {id: fstate.guild, name: null},
                event: 'add',
                type: 'autorole',
                rank: {
                    name: mmr.data.data.current_data.currenttierpatched.split(' ')[0],
                    id: guilddata.autoroles.find(item => mmr.data.data.current_data.currenttierpatched.split(' ')[0].toLowerCase() == item.name).id,
                },
                riotid: userinfo.data.gameName && userinfo.data.tagLine ? `${userinfo.data.gameName}#${userinfo.data.tagLine}` : null,
                rpuuid: userinfo.data.puuid,
                puuid: db.data.data.puuid,
            };
            await getDB('linkv2-logs').insertOne(log_data);
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][8],
                    done: true,
                    success: true,
                    value: log_data,
                },
                req.query.state
            );
            await getDB('state').deleteOne({code: req.query.state});
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][9],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][10],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            return deleteRSO(req.query.state);
        }
        if (fstate.type == 'link') {
            await getDB('rso').updateOne({puuid: userinfo.data.puuid}, {$set: {puuid: userinfo.data.puuid}}, {upsert: true});
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][4],
                    done: true,
                    success: true,
                    value: {puuid: userinfo.data.puuid},
                },
                req.query.state
            );
            await getDB('linkv2').updateOne(
                {userid: fstate.userid},
                {$set: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard}},
                {upsert: true}
            );
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][5],
                    done: true,
                    success: true,
                    value: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard},
                },
                req.query.state
            );
            const log_data = {
                userid: fstate.userid,
                date: new Date(),
                admin: null,
                guild: {id: fstate.guild, name: null},
                event: 'add',
                type: 'link',
                rank: null,
                riotid: userinfo.data.gameName && userinfo.data.tagLine ? `${userinfo.data.gameName}#${userinfo.data.tagLine}` : null,
                rpuuid: userinfo.data.puuid,
                puuid: db.data.data.puuid,
            };
            await getDB('linkv2-logs').insertOne(log_data);
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][6],
                    done: true,
                    success: true,
                    value: log_data,
                },
                req.query.state
            );
            await getDB('state').deleteOne({code: req.query.state});
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][7],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][8],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            return deleteRSO(req.query.state);
        }
        if (fstate.type == 'stats') {
            const matchlist = await axios
                .get(`https://${region.data.activeShard}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${userinfo.data.puuid}`, {
                    headers: {'X-Riot-Token': basedata.riottoken},
                })
                .catch(e => e);
            console.log(matchlist);
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][4],
                    done: true,
                    success: matchlist.response || matchlist.code ? false : true,
                    value: matchlist.response?.data ?? matchlist.code ?? matchlist.data,
                },
                req.query.state
            );
            if (matchlist.response) return deleteRSO(req.query.state);
            patchStats({
                dbstats: {
                    puuid: userinfo.data.puuid,
                    ingamepuuid: db.data.data.puuid,
                    region: region.data.activeShard,
                    type: 'unofficial',
                    tracker: false,
                    last_update: Date.now(),
                    agents: [],
                    matches: [],
                    stats: {},
                },
                mmatches: matchlist.data.history,
                agent: getAgents(),
                modes: getGamemodes(),
            });
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][5],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            await getDB('rso').updateOne({puuid: userinfo.data.puuid}, {$set: {puuid: userinfo.data.puuid}}, {upsert: true});
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][6],
                    done: true,
                    success: true,
                    value: {puuid: userinfo.data.puuid},
                },
                req.query.state
            );
            await getDB('linkv2').updateOne(
                {userid: fstate.userid},
                {$set: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard}},
                {upsert: true}
            );
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][7],
                    done: true,
                    success: true,
                    value: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard},
                },
                req.query.state
            );
            const link_data = {
                userid: fstate.userid,
                date: new Date(),
                admin: null,
                guild: {id: fstate.guild, name: null},
                event: 'add',
                type: 'stats',
                rank: null,
                riotid: userinfo.data.gameName && userinfo.data.tagLine ? `${userinfo.data.gameName}#${userinfo.data.tagLine}` : null,
                rpuuid: userinfo.data.puuid,
                puuid: db.data.data.puuid,
            };
            await getDB('linkv2-logs').insertOne(link_data);
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][8],
                    done: true,
                    success: true,
                    value: link_data,
                },
                req.query.state
            );
            await getDB('state').deleteOne({code: req.query.state});
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][9],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            await stepUpdate(
                fastify.io.to(getClient(req.query.state)),
                {
                    ...steps[fstate.type][10],
                    done: true,
                    success: true,
                    value: null,
                },
                req.query.state
            );
            return deleteRSO(req.query.state);
        }
        return;
    });
    fastify.get('/v1/rso/redirect/:state', async (req, res) => {
        res.redirect(
            301,
            `https://auth.riotgames.com/login#client_id=valorantlabs&redirect_uri=https%3A%2F%2Fvalorantlabs.xyz%2Foauth-finished.html&response_type=code&scope=openid%20offline_access&prompt=login&state=${req.params.state}`
        );
    });
}
