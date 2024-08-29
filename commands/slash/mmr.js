import {
    ComponentType,
    ButtonStyle,
    getDB,
    axios,
    embedBuilder,
    getTranslations,
    topgg,
    getCustomBackground,
    ranks,
    old_ranks,
    getFunction,
    hdevtoken
} from '../../methods.js';

export async function execute({interaction, guilddata} = {}) {
    const translations = getTranslations();
    const getLink = getFunction('getLink');
    const buildBackground = getFunction('buildBackground');
    const buildMMRImage = getFunction('buildMMRImage');
    const errorhandlerinteraction = getFunction('errorhandlerinteraction');
    const dbcheck = await getDB('topggvote').findOne({userid: interaction.user.id});
    if (!dbcheck) {
        const topggusage = await getDB('rate-limit-key').findOne({key: 'topgg'});
        if (topggusage && topggusage.current >= 55)
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].mmr['429_title'],
                        desc: translations[guilddata.lang].mmr['429_desc'],
                        footer: 'VALORANT LABS [MMR TOP.GG ERROR]',
                    }),
                ],
            });
        const topggvote = await axios
            .get(`https://top.gg/api/bots/702201518329430117/check?userId=${interaction.user.id}`, {headers: {Authorization: topgg}})
            .catch(error => {
                return error;
            });
        if (topggvote.response)
            return errorhandlerinteraction({interaction, status: topggvote.response.status, type: 'mmr', lang: guilddata.lang, data: topggvote.response.data});
        await getDB('rate-limit-key').updateOne({key: 'topgg'}, {$inc: {current: 1}, $setOnInsert: {createdAt: new Date()}}, {upsert: true});
        if (topggvote.response)
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].mmr['500_title'],
                        desc: translations[guilddata.lang].mmr['500_desc'],
                        footer: 'VALORANT LABS [MMR TOP.GG ERROR]',
                    }),
                ],
            });
        if (topggvote.data.voted != 1)
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].mmr.not_voted_title,
                        desc: translations[guilddata.lang].mmr.not_voted_desc,
                        footer: 'VALORANT LABS [MMR NOT VOTED]',
                    }),
                ],
                components: [{type: 1, components: [{type: 2, url: 'https://top.gg/bot/702201518329430117/vote', style: 5, label: 'top.gg'}]}],
            });
        await getDB('topggvote').insertOne({userid: interaction.user.id, createdAt: new Date()});
    }
    const link = await getLink({user: interaction.user});
    if (!link && !interaction.options.get('riot-id'))
        return interaction.editReply({
            embeds: [
                embedBuilder({
                    title: translations[guilddata.lang].mmr.no_link_title,
                    desc: translations[guilddata.lang].mmr.no_link_desc,
                    additionalFields: [
                        {name: `/mmr`, value: translations[guilddata.lang].mmr.base},
                        {name: `/mmr riot-id`, value: translations[guilddata.lang].mmr.options},
                    ],
                    footer: 'VALORANT LABS [MMR TOP.GG ERROR]',
                }),
            ],
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {type: ComponentType.Button, label: translations[guilddata.lang].support, style: ButtonStyle.Link, url: 'https://discord.gg/X3GaVkX2YN'},
                    ],
                },
            ],
        });
    const account_details =
        link && !interaction.options.get('riot-id')
            ? link
            : {name: interaction.options.get('riot-id').value.split('#')[0], tag: interaction.options.get('riot-id').value.split('#')[1]};
    if (!account_details.name || !account_details.tag)
        return interaction.editReply({
            embeds: [
                embedBuilder({
                    title: translations[guilddata.lang].stats.invalidriotid_title,
                    desc: translations[guilddata.lang].stats.invalidriotid_desc,
                    footer: 'VALORANT LABS [INVALID RIOT ID]',
                }),
            ],
        });
    const puuid = await axios
        .get(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURI(account_details.name)}/${encodeURI(account_details.tag)}?asia=true`, {headers: {Authorization: hdevtoken}})
        .catch(error => {
            return error;
        });
    if (puuid.response) return errorhandlerinteraction({interaction, status: puuid.response.status, type: 'account', lang: guilddata.lang, data: puuid.response.data});
    const mmrdb = await getDB('mmr').findOne({puuid: puuid.data.data.puuid});
    const mmr = mmrdb
        ? mmrdb
        : await axios.get(`https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/${puuid.data.data.region}/${puuid.data.data.puuid}`, {headers: {Authorization: hdevtoken}}).catch(error => {
              return error;
          });
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
