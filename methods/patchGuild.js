import {
    getDB,
    unlinkSync,
    embedBuilder,
    ComponentType,
    ButtonStyle,
    writeFileSync,
    brotliCompressSync,
    getTranslations,
    ranks,
    getFunction,
    getAgents,
    getGamemodes,
    axios,
} from '../methods.js';
import {constants} from "zlib";

const getAutoRoles = getFunction('getAutoRoles');
const getGuild = getFunction('getGuild');
const buildMMRImage = getFunction('buildMMRImage');
const buildGameImage = getFunction('buildGameImage');
const buildStatsImage = getFunction('buildStatsImage');
const buildBackground = getFunction('buildBackground');

export const patchGuild = async function ({interaction, key, value, additionaldata, guilddata} = {}) {
    let doc;
    const translations = getTranslations();
    switch (key) {
        case 'prefix': {
            doc = await getDB('settings').findOneAndUpdate(
                {gid: interaction.guildId},
                {$set: {prefix: value}},
                {upsert: false, returnDocument: 'after', includeResultMetadata: false}
            );
            break;
        }
        case 'language': {
            doc = await getDB('settings').findOneAndUpdate(
                {gid: interaction.guildId},
                {$set: {lang: value}},
                {upsert: false, returnDocument: 'after', includeResultMetadata: false}
            );
            break;
        }
        case 'patchnotes': {
            doc = await getDB('settings').findOneAndUpdate(
                {gid: interaction.guildId},
                {$set: {news: value}},
                {upsert: false, returnDocument: 'after', includeResultMetadata: false}
            );
            break;
        }
        case 'othernews': {
            doc = await getDB('settings').findOneAndUpdate(
                {gid: interaction.guildId},
                {$set: {onews: value}},
                {upsert: false, returnDocument: 'after', includeResultMetadata: false}
            );
            break;
        }
        case 'serverstatus': {
            doc = await getDB('settings').findOneAndUpdate(
                {gid: interaction.guildId},
                {$set: {serverstatus: value}},
                {upsert: false, returnDocument: 'after', includeResultMetadata: false}
            );
            break;
        }
        case 'background': {
            if (value == false) {
                doc = await getDB('settings').findOneAndUpdate(
                    {gid: interaction.guildId},
                    {$set: {background: value}},
                    {upsert: false, returnDocument: 'before', includeResultMetadata: false}
                );
                unlinkSync(`./settings/backgrounds/${doc.background}.png`);
                doc.background = false;
            } else {
                doc = await getDB('settings').findOne({gid: interaction.guildId});
                await interaction.editReply({
                    embeds: [
                        embedBuilder({
                            title: translations[doc.lang].settings.imggeneration_title,
                            desc: translations[doc.lang].settings.imggeneration_desc,
                        }),
                    ],
                });
                let bgcanvas;
                let image;
                switch (interaction.options.get('type').value) {
                    case 'stats': {
                        const dbstats = await getDB('userstats').findOne({ingamepuuid: '54942ced-1967-5f66-8a16-1e0dae875641'});
                        dbstats.name = 'Henrik3';
                        dbstats.tag = 'VALO';
                        bgcanvas = await buildBackground(interaction.options.getAttachment('image').url, 'stats');
                        image = await buildStatsImage({dbstats, agent: getAgents(), modes: getGamemodes(), bgcanvas});
                        break;
                    }
                    case 'game': {
                        bgcanvas = await buildBackground(interaction.options.getAttachment('image').url, 'game');
                        image = (await buildGameImage({matchid: 'd6007c31-b293-41c3-b1f6-0e797978447b', guilddata: doc, bgcanvas})).image;
                        break;
                    }
                    case 'mmr': {
                        const mmrdata = await getDB('mmr').findOne({puuid: '54942ced-1967-5f66-8a16-1e0dae875641'});
                        bgcanvas = await buildBackground(interaction.options.getAttachment('image').url, 'mmr');
                        image = await buildMMRImage({mmrdata, bgcanvas, seasonid: 'e1a2'});
                        break;
                    }
                }
                return interaction.editReply({
                    files: [image],
                    embeds: [
                        embedBuilder({
                            title: translations[doc.lang].settings.imggenerated_title,
                            desc: translations[doc.lang].settings.imggenerated_desc,
                            footer: interaction.options.getAttachment('image').url,
                        }),
                    ],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                {
                                    type: ComponentType.Button,
                                    style: ButtonStyle.Success,
                                    label: translations[doc.lang].settings.imggenerated_label_accept,
                                    customId: `settings;background;${interaction.options.get('type').value};accept`,
                                },
                                {
                                    type: ComponentType.Button,
                                    style: ButtonStyle.Danger,
                                    label: translations[doc.lang].settings.imggenerated_label_deny,
                                    customId: `settings;background;${interaction.options.get('type').value};deny`,
                                },
                            ],
                        },
                    ],
                });
            }
            break;
        }
        case '_background': {
            const background = await axios.get(interaction.message.embeds[0].footer.text, {responseType: 'arraybuffer'}).catch(error => {
                return error;
            });
            if (background.response) {
                doc = await getDB('settings').findOne({gid: interaction.guildId});
                return interaction.editReply({
                    embeds: [
                        embedBuilder({
                            title: translations[doc.lang].settings.imgsaveerror_title,
                            desc: translations[doc.lang].settings.imgsaveerror_desc + `\n\n\`\`\`${background.response.data}\`\`\``,
                        }),
                    ],
                });
            }
            const compressed = brotliCompressSync(background.data, {params: {[constants.BROTLI_PARAM_QUALITY]: 6}});
            writeFileSync(`./settings/backgrounds/${value}.png`, compressed);
            if (additionaldata == 'stats')
                doc = await getDB('settings').findOneAndUpdate(
                    {gid: interaction.guildId},
                    {$set: {background_stats: value}},
                    {upsert: false, returnDocument: 'after', includeResultMetadata: false}
                );
            if (additionaldata == 'game')
                doc = await getDB('settings').findOneAndUpdate(
                    {gid: interaction.guildId},
                    {$set: {background_game: value}},
                    {upsert: false, returnDocument: 'after', includeResultMetadata: false}
                );
            if (additionaldata == 'mmr')
                doc = await getDB('settings').findOneAndUpdate(
                    {gid: interaction.guildId},
                    {$set: {background_mmr: value}},
                    {upsert: false, returnDocument: 'after', includeResultMetadata: false}
                );
            break;
        }
        case 'autoroles': {
            const autoroleupdate = {};
            autoroleupdate[`autoroles.${guilddata.autoroles?.findIndex(item => item.name == value)}`] = {id: additionaldata, name: value};
            doc =
                guilddata.autoroles && guilddata.autoroles.some(item => item.name == value)
                    ? await getDB('settings').findOneAndUpdate(
                          {gid: interaction.guildId},
                          {$set: autoroleupdate},
                          {upsert: false, returnDocument: 'after', includeResultMetadata: false}
                      )
                    : await getDB('settings').findOneAndUpdate(
                          {gid: interaction.guildId},
                          {$push: {autoroles: {id: additionaldata, name: value}}},
                          {upsert: false, returnDocument: 'after', includeResultMetadata: false}
                      );
            const autoroles_data = await getAutoRoles({interaction, guilddata: doc});
            const mapping = {
                0: 0,
                1: 5,
                2: 8,
                3: 11,
                4: 14,
                5: 17,
                6: 20,
                7: 23,
                8: 26,
                9: 27,
            };
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: `AutoRoles ${interaction.guild.name}`,
                        desc: translations[guilddata.lang].autorole.settings_desc,
                        additionalFields: autoroles_data,
                        footer: 'VALORANT LABS [AUTOROLES]',
                    }),
                ],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.StringSelect,
                                customId: `autoroles;settings`,
                                maxValues: 1,
                                minValues: 1,
                                placeholder: translations[guilddata.lang].autorole.settings_placeholder,
                                options: autoroles_data.map((i, index) => {
                                    const crank = ranks[mapping[index]];
                                    return {
                                        emoji: {
                                            id: i.value.startsWith('<@&')
                                                ? crank.discordid.substring(2, crank.discordid.length - 1).split(':')[1]
                                                : crank.graydiscordid.substring(2, crank.graydiscordid.length - 1).split(':')[1],
                                        },
                                        label: i.name,
                                        value: String(mapping[index]),
                                        description: i.value.startsWith('<@&')
                                            ? translations[guilddata.lang].autorole.settings_set
                                            : translations[guilddata.lang].autorole.settings_not_set,
                                    };
                                }),
                            },
                        ],
                    },
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Danger,
                                label: translations[guilddata.lang].autorole.back_to_overview,
                                customId: `autoroles;overview`,
                            },
                        ],
                    },
                ],
                attachments: [],
            });
        }
    }
    getGuild(interaction);
};
