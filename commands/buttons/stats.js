import {
    ComponentType,
    moment,
    getAgents,
    getGamemodes,
    gamemodes,
    axios,
    embedBuilder,
    getTranslations,
    riottoken,
    getCustomBackground,
    getFunction, hdevtoken,
} from '../../methods.js';

export async function execute({interaction, args, guilddata} = {}) {
    await interaction.deferUpdate();
    const translations = getTranslations();
    const agent = getAgents();
    const modes = getGamemodes();
    const buildStatsImage = getFunction('buildStatsImage');
    const getStatsDB = getFunction('getStatsDB');
    const patchStats = getFunction('patchStats');
    const buildBackground = getFunction('buildBackground');
    const errorhandlerinteraction = getFunction('errorhandlerinteraction');
    const components = [];
    const dbstats = await getStatsDB({name: args[2], tag: args[3]});
    if (dbstats.status != 200)
        return errorhandlerinteraction({
            status: dbstats.status,
            lang: guilddata.lang,
            type: 'account',
            puuid: dbstats.puuid,
            name: dbstats.name,
            tag: dbstats.tag,
            interaction,
            data: dbstats.data,
        });
    const matchlist =
        dbstats.type == 'official' || dbstats.type == null
            ? await axios
                  .get(`https://${dbstats.region}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${dbstats.puuid}`, {headers: {'X-Riot-Token': riottoken}})
                  .catch(e => e)
            : await axios.get(`https://api.henrikdev.xyz/valorantlabs/v1/matches/${dbstats.region}/${dbstats.ingamepuuid}`, {headers: {Authorization: hdevtoken}}).catch(e => e);
    if (matchlist.response)
        return errorhandlerinteraction({
            type: 'matchlist',
            status: matchlist.response.status,
            interaction,
            lang: guilddata.lang,
            data: matchlist.response.data,
        });
    const missingmatches = matchlist.data.history.filter(item => item.gameStartTimeMillis > (dbstats.last_update ?? 0));

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
    const newmessage = await interaction.editReply({
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
    if (missingmatches.length) patchStats({dbstats, mmatches: missingmatches, message: newmessage, lang: guilddata.lang, agent, modes, bgcanvas});
}
export const name = 'stats';
