import {
    ComponentType,
    getAgents,
    getGamemodes,
    errorhandler,
    axios,
    moment,
    embedBuilder,
    gamemodes,
    getCustomBackground,
    getTranslations,
    riottoken,
    getFunction, hdevtoken,
} from '../../methods.js';

export async function execute({message, guilddata, args} = {}) {
    const getLink = getFunction('getLink');
    const link = await getLink({user: message.author});
    const translations = getTranslations();
    const agent = getAgents();
    const modes = getGamemodes();
    const buildStatsImage = getFunction('buildStatsImage');
    const getStatsDB = getFunction('getStatsDB');
    const patchStats = getFunction('patchStats');
    const buildBackground = getFunction('buildBackground');
    const components = [];
    let dbstats;
    let matchlist;
    if (link && link.error)
        return errorhandler({
            message,
            status: link.error,
            lang: guilddata.lang,
            type: 'account',
            data: link.data,
        });
    if (link && !args.length) {
        dbstats = await getStatsDB({name: link.name, tag: link.tag});
        if (dbstats.status != 200)
            return errorhandler({
                status: dbstats.status,
                lang: guilddata.lang,
                type: 'account',
                puuid: dbstats.puuid,
                name: dbstats.name,
                tag: dbstats.tag,
                message,
                data: dbstats.data,
            });
        matchlist =
            dbstats.type == 'official' || dbstats.type == null
                ? await axios
                      .get(`https://${dbstats.region}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${dbstats.puuid}`, {
                          headers: {'X-Riot-Token': riottoken},
                      })
                      .catch(error => {
                          return error;
                      })
                : await axios.get(`https://api.henrikdev.xyz/valorantlabs/v1/matches/${dbstats.region}/${dbstats.ingamepuuid}`,{headers: {Authorization: hdevtoken}}).catch(error => {
                      return error;
                  });
    }
    if ((!link && args.length) || (link && args.length)) {
        if (!message.content.includes('#'))
            return message.reply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].stats.invalidriotid_title,
                        desc: Uts.translations[guilddata.lang].stats.invalidriotid_desc,
                        footer: 'VALORANT LABS [INVALID RIOT ID]',
                    }),
                ],
            });
        const name = message.content.substr(guilddata.prefix.length + 6).split('#');
        dbstats = await getStatsDB({name: name[0], tag: name[1]});
        if (dbstats.status != 200)
            return errorhandler({
                status: dbstats.status,
                lang: guilddata.lang,
                type: 'account',
                puuid: dbstats.puuid,
                name: dbstats.name,
                tag: dbstats.tag,
                message,
                data: dbstats.data,
            });
        matchlist =
            dbstats.type == 'official' || dbstats.type == null
                ? await axios
                      .get(`https://${dbstats.region}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${dbstats.puuid}`, {
                          headers: {'X-Riot-Token': riottoken},
                      })
                      .catch(error => {
                          return error;
                      })
                : await axios.get(`https://api.henrikdev.xyz/valorantlabs/v1/matches/${dbstats.region}/${dbstats.ingamepuuid}`, {headers: {Authorization: hdevtoken}}).catch(error => {
                      return error;
                  });
    }
    if (!link && !args.length)
        return message.reply({
            embeds: [
                embedBuilder({
                    title: translations[guilddata.lang].stats.noriotid_title,
                    desc: translations[guilddata.lang].stats.noriotid_desc,
                    footer: 'VALORANT LABS [NO RIOT ID]',
                }),
            ],
        });

    if (matchlist.response)
        return errorhandler({
            type: 'matchlist',
            status: matchlist.response.status,
            message,
            lang: guilddata.lang,
            data: matchlist.response.data,
        });

    const missingmatches = matchlist.data.history.filter(item => item.gameStartTimeMillis > (dbstats.last_update ? dbstats.last_update : 0));

    const bgcanvas = guilddata.background_stats ? await buildBackground(getCustomBackground(guilddata.background_stats), 'stats') : null;
    const attachment = dbstats.stats ? await buildStatsImage({dbstats, agent, modes, bgcanvas}) : null;
    if (!missingmatches.length) {
        for (let i = 0; dbstats.matches.length > i; i++) {
            components.push({
                label: dbstats.matches[i].gamekey,
                value: dbstats.matches[i].id,
                description: `${dbstats.matches[i].map} | ${dbstats.matches[i].mode} | ${dbstats.matches[i].agent} | ${moment(dbstats.matches[i].start).format('lll')}`,
                emoji: Object.values(gamemodes).find(item => item.name == dbstats.matches[i].mode).emoji,
            });
        }
    }
    const newmessage = await message.reply({
        files: attachment ? [attachment] : null,
        embeds: missingmatches.length
            ? [
                  embedBuilder({
                      title: translations[guilddata.lang].stats.missing_matches_title,
                      desc: translations[guilddata.lang].stats.missing_matches_desc,
                      footer: 'VALORANT LABS [STATS]',
                  }),
              ]
            : [],
        components: components.length
            ? [
                  {
                      type: ComponentType.ActionRow,
                      components: [
                          {
                              type: ComponentType.SelectMenu,
                              customId: `game`,
                              maxValues: 1,
                              minValues: 0,
                              options: components,
                              placeholder: translations[guilddata.lang].stats.game_select,
                          },
                      ],
                  },
              ]
            : [],
    });
    console.timeEnd();
    if (missingmatches.length)
        patchStats({
            dbstats,
            mmatches: missingmatches,
            message: newmessage,
            lang: guilddata.lang,
            agent,
            modes,
            bgcanvas,
        });
}
export const name = 'stats';
