import {ApplicationCommandType, ApplicationCommandOptionType, ShardingManager, REST, Routes} from 'discord.js';
import {AutoPoster} from 'topgg-autoposter';
import {getDB, getTranslations, riottoken, getAgents, getGamemodes, getFunction, brotliDecompressSync, updateFunctions} from './methods.js';
import {readFileSync, existsSync} from 'fs';
import * as f from 'fastify';
import axios from 'axios';
import path from 'path';
import _ from 'lodash';

const fastify = f.fastify({logger: {level: 'error'}});
const basedata = JSON.parse(readFileSync('./basedata.json'));
const __dirname = path.resolve();
let application_commands = [];
let rso = [];
const environment = basedata.environment;

const manager = new ShardingManager('./index.js', {
    token: environment == 'staging' ? basedata.stagingtoken : environment == 'pbe' ? basedata.betatoken : basedata.discordtoken,
    totalShards: environment == 'live' ? 14 : 2,
    respawn: true,
});
if (environment == 'live') AutoPoster(basedata.dbltoken, manager);
const rest = new REST({version: '10'}).setToken(environment == 'staging' ? basedata.stagingtoken : environment == 'pbe' ? basedata.betatoken : basedata.discordtoken);

const checkVerify = async (req, res, dbcheck = null) => {
    if (!req.headers.cookie && !req.headers.auth)
        return res.code(401).send({
            redirect:
                environment == 'pbe'
                    ? 'https://discord.com/api/oauth2/authorize?client_id=864881059950231593&redirect_uri=https%3A%2F%2Fbeta.valorantlabs.xyz%2Fapi%2Fv1%2Flogin%2Fdiscord&response_type=code&scope=guilds.members.read%20identify%20guilds'
                    : 'https://discord.com/api/oauth2/authorize?client_id=702201518329430117&redirect_uri=https%3A%2F%2Fvalorantlabs.xyz%2Fapi%2Fv1%2Flogin%2Fdiscord&response_type=code&scope=guilds%20identify%20guilds.members.read',
        });
    const uuid = req.headers.auth ?? getCookie('auth', req);
    const db = await getDB('dashboard').findOne({uuid});
    if (!db)
        return res.code(401).send({
            redirect:
                environment == 'pbe'
                    ? 'https://discord.com/api/oauth2/authorize?client_id=864881059950231593&redirect_uri=https%3A%2F%2Fbeta.valorantlabs.xyz%2Fapi%2Fv1%2Flogin%2Fdiscord&response_type=code&scope=guilds.members.read%20identify%20guilds'
                    : 'https://discord.com/api/oauth2/authorize?client_id=702201518329430117&redirect_uri=https%3A%2F%2Fvalorantlabs.xyz%2Fapi%2Fv1%2Flogin%2Fdiscord&response_type=code&scope=guilds%20identify%20guilds.members.read',
        });
    if (dbcheck && !db.guilds.some(i => i.id == dbcheck)) return res.code(403).send({message: 'Guild not available for client'});
    return db;
};
const getCookie = (name, req) => {
    const nameEQ = name + '=';
    const ca = req.headers.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        const c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};
const getManager = () => {
    return manager;
};
const getApplicationCommands = () => {
    return application_commands;
};
const addRSO = (uuid, type, steps) => {
    rso.push({
        uuid,
        type,
        steps: steps.map(i => {
            return {...i, done: false, value: null, success: null};
        }),
    });
};
const getRSO = uuid => {
    return rso.find(i => i.uuid == uuid) ?? null;
};
const updateRSO = (uuid, data) => {
    rso.find(i => i.uuid == uuid).steps[rso.find(i => i.uuid == uuid).steps.findIndex(i => i.step == data.step)] = data;
    return;
};
const deleteRSO = uuid => {
    setTimeout(() => {
        if (rso.some(i => i.uuid == uuid)) rso.splice(i => i.uuid == uuid);
    }, 60 * 1000 * 15);
    return;
};

updateFunctions();
let restart = false;
setInterval(async () => {
    if (environment == 'live') {
        const fetchWebsite = getFunction('fetchWebsite');
        const shard_status_update = getFunction('shard_status_update');
        fetchWebsite(manager);
        shard_status_update(manager);
        application_commands = await rest.get(Routes.applicationCommands(await manager.shards.first().fetchClientValue('user.id')));
    }
}, 150000);

manager.on('shardCreate', async shard => {
    shard.on('message', async message => {
        if (typeof message == 'string' && message.startsWith('restart')) {
            manager.shards.get(Number(message.split('-')[1])).respawn();
            restart = true;
            setTimeout(function () {
                restart = false;
            }, 60000);
        }
    });
    shard.on('ready', async rshard => {
        console.log('Ready', shard.id);
        if (manager.shards.size == manager.totalShards && restart == false) {
            if (environment != 'live') {
                const fetchWebsite = getFunction('fetchWebsite');
                const shard_status_update = getFunction('shard_status_update');
                fetchWebsite(manager);
                shard_status_update(manager);
            }
            manager.shards.forEach(sshard => {
                sshard.send('startup');
            });
        }
        if (shard.id == 0) application_commands = await rest.get(Routes.applicationCommands(await shard.fetchClientValue('user.id')));
    });
    console.log(`Launched shard ${shard.id}`);
});

fastify.addHook('onRequest', async (req, res) => {
    console.log(req.headers.host, req.url);
    if (['.png', '.css', '.html', '.js', '.svg', '.jpg', '.jpeg'].some(i => req.url.endsWith(i))) {
        if (req.url.endsWith('.png')) res.type('image/png');
        if (req.url.endsWith('.css')) res.type('text/css');
        if (req.url.endsWith('.html')) res.type('text/html');
        if (req.url.endsWith('.js')) res.type('text/javascript');
        if (req.url.endsWith('.svg')) res.type('image/svg+xml');
        if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg')) res.type('image/jpeg');
    } else res.type('application/json; charset=UTF-8');
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', true);
    res.header(
        'Access-Control-Allow-Headers',
        'auth, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Set-Cookie, Cookie'
    );
    if (req.method == 'OPTIONS') return res.code(200).send();
});

fastify.setNotFoundHandler((req, res) => {
    if (!req.url.includes('api')) return res.type('text/html').send(readFileSync('./dist/index.html', {encoding: 'utf-8'}));
    return res.code(404).send({message: 'Not found'});
});

fastify.register(import('@fastify/multipart'), {attachFieldsToBody: true});
fastify.register(import('@fastify/cors'), {});
fastify.register(import('@fastify/static'), {
    root: path.join(__dirname, 'dist'),
});
fastify.register(import('fastify-socket.io'), {
    cors: true,
    origins: ['https://valorantlabs.xyz', 'http://127.0.0.1:8080', 'https://beta.valorantlabs.xyz'],
});

fastify.get('/', (req, res) => {
    res.type('text/html').send(readFileSync('./dist/index.html', {encoding: 'utf-8'}));
});

/*fastify.get('/v1/pagedata', async (req, res) => {
    const translations = getTranslations();
    if (req.query.type == 'landingpage') {
        const guild = (await manager.fetchClientValues('guilds.cache.size')).reduce((prev, val) => prev + val, 0);
        const commands = JSON.parse(readFileSync('./api.json'));
        const utils = JSON.parse(readFileSync('./utils.json', {encoding: 'utf-8'}));
        const parselang = {
            de: 'German',
            en: 'English',
            jp: 'Japanese',
            'pt-br': 'Portuguese',
            fr: 'French',
            es: 'Spanish',
            vi: 'Vietname',
        };
        return res.code(200).send({
            guild: guild,
            cmds: commands.all,
            cmdlist: utils.cmds,
            langlist: utils.langlist,
            translations: utils.translations,
            clang: req.query.lang != undefined ? (parselang[req.query.lang] != undefined ? parselang[req.query.lang] : 'English') : 'English',
        });
    } else if (req.query.type == 'translation') {
        const utils = JSON.parse(readFileSync('./utils.json', {encoding: 'utf-8'}));
        return res.code(200).send({langtranslations: translations, translations: utils.translations});
    } else if (req.query.type == 'shards') {
        const sharddata = await manager.broadcastEval(client => {
            return {status: client.ws.status, ping: client.ws.ping, server: client.guilds.cache.size};
        });
        res.send(sharddata);
    } else {
        return res.send('ok');
    }
});

fastify.get('/oauth-finished.html', async (req, res) => {
    console.log(req.query);
    const patchStats = getFunction('patchStats');
    const translations = getTranslations();
    if (req.query.state) {
        const fstate = await getDB('state').findOne({code: req.query.state});
        if (!fstate)
            return res.redirect(
                301,
                `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                    JSON.stringify({
                        rank: null,
                        full: null,
                        error: `The Link is older than one hour, please generate a new one`,
                    })
                )}`
            );
        const formData = new URLSearchParams();
        formData.append('grant_type', 'authorization_code');
        formData.append('code', req.query.code);
        formData.append('redirect_uri', 'https://valorantlabs.xyz/oauth-finished.html');
        const tokens = await axios
            .post('https://auth.riotgames.com/token', formData, {
                headers: {Authorization: `Basic ${Buffer.from(basedata.client_secret).toString('base64')}`},
            })
            .catch(error => {
                return error;
            });
        const userinfo = await axios
            .get('https://europe.api.riotgames.com/riot/account/v1/accounts/me', {
                headers: {Authorization: `Bearer ${tokens.data.access_token}`},
            })
            .catch(error => {
                return error;
            });
        if (userinfo.response)
            return res.redirect(
                301,
                `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                    JSON.stringify({
                        rank: null,
                        full: null,
                        error: `There seems to be an error with the riot server | Status: ${userinfo.response.status}`,
                    })
                )}`
            );
        if (fstate.type == 'delete') {
            getDB('rso').deleteMany({puuid: userinfo.data.puuid});
            getDB('state').deleteOne({code: req.query.state});
            return res.redirect(
                301,
                `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                    JSON.stringify({
                        rank: null,
                        full: null,
                        error: null,
                        message: 'Your account was successfully set to a private state',
                    })
                )}`
            );
        }
        const region = await axios
            .get(`https://europe.api.riotgames.com/riot/account/v1/active-shards/by-game/val/by-puuid/${userinfo.data.puuid}`, {
                headers: {'X-Riot-Token': basedata.riottoken},
            })
            .catch(error => {
                return error;
            });
        if (region.response)
            return res.redirect(
                301,
                `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                    JSON.stringify({
                        rank: null,
                        full: null,
                        error: `There seems to be an error with region of your account | Status: ${region.response.status} | Message: ${region.response.message}`,
                        message: null,
                    })
                )}`
            );
        const db = await axios
            .get(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURI(userinfo.data.gameName)}/${encodeURI(userinfo.data.tagLine)}?asia=true`)
            .catch(error => {
                return error;
            });
        if (db.response)
            return res.redirect(
                301,
                `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                    JSON.stringify({
                        rank: null,
                        full: null,
                        error: `There seems to be an error with the requested account | Status: ${db.response.status} | Message: ${db.response.data.message}`,
                        message: null,
                    })
                )}`
            );
        if (fstate.type == 'autorole') {
            const guilddata = await getDB('settings').findOne({gid: fstate.guild});
            const mmr = await axios.get(`https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/${region.data.activeShard}/${db.data.data.puuid}?asia=true`).catch(error => {
                return error;
            });
            if (mmr.response)
                return res.redirect(
                    301,
                    `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                        JSON.stringify({
                            rank: null,
                            full: null,
                            error: `There seems to be an error with the mmr of that account | Status: ${mmr.response.status} | Message: ${mmr.response.data.message}`,
                            message: null,
                        })
                    )}`
                );
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
                return res.redirect(
                    301,
                    `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                        JSON.stringify({
                            rank: null,
                            full: null,
                            error: translations[guilddata.lang].mmr.no_rank_desc,
                            message: null,
                        })
                    )}`
                );
            }
            if (!guilddata.autoroles.some(item => mmr.data.data.current_data.currenttierpatched.split(' ')[0].toLowerCase() == item.name))
                return res.redirect(
                    301,
                    `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                        JSON.stringify({
                            rank: null,
                            full: null,
                            error: "The rank you have isn't configured yet, please ask the owner or admin of the server to reconfigure/resend the autorole system",
                            message: null,
                        })
                    )}`
                );
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
            getDB('rso').updateOne({puuid: userinfo.data.puuid}, {$set: {puuid: userinfo.data.puuid}}, {upsert: true});
            getDB('linkv2').updateOne(
                {userid: fstate.userid},
                {$set: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard}},
                {upsert: true}
            );
            await getDB('linkv2-logs').insertOne({
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
            });
            getDB('state').deleteOne({code: req.query.state});
            return res.redirect(
                301,
                `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                    JSON.stringify({
                        rank: mmr.data.data.current_data.currenttier,
                        full: null,
                        error: null,
                        message: `Your account was successfully linked and your role was given`,
                    })
                )}`
            );
        }
        if (fstate.type == 'link') {
            getDB('rso').updateOne({puuid: userinfo.data.puuid}, {$set: {puuid: userinfo.data.puuid}}, {upsert: true});
            getDB('linkv2').updateOne(
                {userid: fstate.userid},
                {$set: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard}},
                {upsert: true}
            );
            await getDB('linkv2-logs').insertOne({
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
            });
            getDB('state').deleteOne({code: req.query.state});
            return res.redirect(
                301,
                `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                    JSON.stringify({
                        rank: null,
                        full: null,
                        error: null,
                        message: `Your account was successfully linked`,
                    })
                )}`
            );
        }
        if (fstate.type == 'stats') {
            const matchlist = await axios
                .get(`https://${region.data.activeShard}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${userinfo.data.puuid}`, {
                    headers: {'X-Riot-Token': riottoken},
                })
                .catch(error => {
                    return error;
                });
            if (matchlist.response)
                return res.redirect(
                    301,
                    `https://valorantlabs.xyz/rso/oauth?data=${btoa(
                        JSON.stringify({
                            rank: null,
                            full: null,
                            error: `There seems to be an issue with your matchlist | Status: ${matchlist.response.status} | PUUID: ${db.data.data.puuid}`,
                            message: null,
                        })
                    )}`
                );
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
            getDB('rso').updateOne({puuid: userinfo.data.puuid}, {$set: {puuid: userinfo.data.puuid}}, {upsert: true});
            getDB('linkv2').updateOne(
                {userid: fstate.userid},
                {$set: {puuid: db.data.data.puuid, rpuuid: userinfo.data.puuid, region: region.data.activeShard}},
                {upsert: true}
            );
            await getDB('linkv2-logs').insertOne({
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
            });
            getDB('state').deleteOne({code: req.query.state});
            return res.redirect(301, 'https://discord.com/channels/@me');
        }
        return;
    }
});

fastify.get('/rso/oauth', async (req, res) => {
    const oauth = readFileSync('./website/build/oauth.html', {encoding: 'utf-8'});
    res.type('text/html').send(oauth);
});*/

fastify.register(import('./routes/auth.js'));
fastify.register(import('./routes/invites.js'));
fastify.register(import('./routes/public.js'));
fastify.register(import('./routes/rso.js'));
fastify.register(import('./routes/test.js'));
fastify.register(import('./routes/topgg.js'));
fastify.register(import('./routes/cdn.js'));

fastify.listen({port: environment == 'staging' ? 4200 : environment == 'pbe' ? 4201 : 4200, host: '127.0.0.1'}, (err, address) => {
    if (err) throw err;
    fastify.io.on('connection', socket => {
        console.log('Connected: ', socket.id);
        const rso = getRSO(socket.handshake.query.rso);
        if (!rso) return socket.emit('UNKNOWN_STATE', {unknown_state: true});
        socket.emit('INIT_PLAN', rso);
    });
});

manager.spawn({timeout: -1});

export {
    checkVerify,
    getManager,
    getDB,
    axios,
    basedata,
    readFileSync,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    getApplicationCommands,
    getFunction,
    getTranslations,
    getAgents,
    getGamemodes,
    addRSO,
    getRSO,
    updateRSO,
    deleteRSO,
    _,
    existsSync,
    brotliDecompressSync,
    environment,
};
