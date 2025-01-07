import {
    ComponentType,
    getDB,
    axios,
    embedBuilder,
    getTranslations,
    getCustomBackground,
    ranks,
    old_ranks,
    getFunction,
    hdevtoken
} from '../../methods.js';

export async function execute({interaction, args, guilddata} = {}) {
    await interaction.deferUpdate();
    const buildBackground = getFunction('buildBackground');
    const buildMMRImage = getFunction('buildMMRImage');
    const errorhandlerinteraction = getFunction('errorhandlerinteraction');
    const translations = getTranslations();
    const puuid = await axios.get(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURI(args[1])}/${encodeURI(args[2])}?asia=true`, {headers: {Authorization: hdevtoken}}).catch(e => e);
    if (puuid.response) return errorhandlerinteraction({interaction, status: puuid.response.status, type: 'account', lang: guilddata.lang, data: puuid.response.data});
    if (!puuid.data) console.error(puuid);
    const mmrdb = await getDB('mmr').findOne({puuid: puuid.data.data.puuid});
    const mmr = mmrdb ?? (await axios.get(`https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/${puuid.data.data.region}/${puuid.data.data.puuid}`, {headers: {Authorization: hdevtoken}}).catch(e => e));
    if (mmr.response) return errorhandlerinteraction({interaction, status: mmr.response.status, type: 'stats', lang: guilddata.lang, data: mmr.response.data});
    const bgcanvas = guilddata.background_mmr ? await buildBackground(getCustomBackground(guilddata.background_mmr), 'mmr') : null;
    if (!mmrdb) await getDB('mmr').insertOne({puuid: puuid.data.data.puuid, data: mmr.data, createdAt: new Date()});
    const seasonsvalues = Object.entries(mmr.data.data.by_season).filter(item => !item[1].error && typeof item[1].wins == 'number' && item[1].wins != 0);
    if (!seasonsvalues.length)
        return interaction.editReply({
            embeds: [
                embedBuilder({
                    title: translations[guilddata.lang].mmr.no_rank_title,
                    desc: translations[guilddata.lang].mmr.no_rank_desc,
                    footer: 'VALORANT LABS [MMR ERROR]',
                }),
            ],
        });
    const seasonscomponents = [];
    for (let i = 0; seasonsvalues.length > i; i++) {
        const crank = seasonsvalues[i][1].old ? old_ranks[seasonsvalues[i][1].final_rank] : ranks[seasonsvalues[i][1].final_rank];
        const emoji = crank.discordid.substring(2, crank.discordid.length - 1).split(':');
        seasonscomponents.push({
            label: seasonsvalues[i][0],
            value: seasonsvalues[i][0],
            description: `${seasonsvalues[i][1].act_rank_wins[seasonsvalues[i][1].act_rank_wins.length - 1].patched_tier} - ${
                seasonsvalues[i][1].act_rank_wins[0].patched_tier
            }`,
            emoji: {
                name: emoji[0],
                id: emoji[1],
            },
        });
    }
    const attachment = await buildMMRImage({mmrdata: mmr.data.data, bgcanvas});
    interaction.editReply({
        embeds: [],
        files: [attachment],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.SelectMenu,
                        customId: `mmr;${puuid.data.data.region};${puuid.data.data.puuid}`,
                        maxValues: 1,
                        minValues: 0,
                        options: seasonscomponents,
                        placeholder: translations[guilddata.lang].mmr.season_select,
                    },
                ],
            },
        ],
    });
}
export const name = 'mmr';
