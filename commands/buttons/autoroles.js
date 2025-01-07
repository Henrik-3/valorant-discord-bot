import {
    uuidv4,
    getDB,
    embedBuilder,
    getTranslations,
    axios,
    roles,
    firstletter,
    getFunction,
    ComponentType,
    ranks,
    ChannelType,
    ButtonStyle,
    hdevtoken
} from '../../methods.js';

export async function execute({interaction, args, guilddata} = {}) {
    const translations = getTranslations();
    const errorhandlerinteraction = getFunction('errorhandlerinteraction');
    const getLink = getFunction('getLink');
    const getAutoRoles = getFunction('getAutoRoles');
    if (['generate', 'update', 'remove'].some(i => i == args[1])) await interaction.deferReply({ephemeral: true});
    else await interaction.deferUpdate({ephemeral: true});
    switch (args[1]) {
        case 'generate': {
            const uuid = uuidv4();
            await getDB('state').insertOne({userid: interaction.user.id, guild: interaction.guildId, code: uuid, expireAt: new Date(), type: 'autorole'});
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].link.link_generated_title,
                        desc: translations[guilddata.lang].link.link_generated_desc + `https://valorantlabs.xyz/v1/rso/redirect/${uuid}`,
                        footer: 'VALORANT LABS [LINK GENERATED]',
                    }),
                ],
            });
        }
        case 'update': {
            const link = await getLink({user: interaction.user});
            if (link == null || typeof link.error == 'number')
                return interaction.editReply({
                    embeds: [
                        embedBuilder({
                            title: translations[guilddata.lang].link.nolink_title,
                            desc: translations[guilddata.lang].link.nolink_desc,
                            footer: 'VALORANT LABS [NO LINK V2]',
                        }),
                    ],
                });
            const mmr = await axios.get(`https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/${link.link.region}/${link.link.puuid}?asia=true`, {headers: {Authorization: hdevtoken}}).catch(error => {
                return error;
            });
            if (mmr.response) return errorhandlerinteraction({interaction, status: mmr.response, type: 'mmr', lang: guilddata.lang, data: mmr.response.data});
            if (mmr.data.data.current_data.currenttier == null || mmr.data.data.current_data.games_needed_for_rating != 0 || mmr.data.data.current_data.old) {
                if (guilddata.autoroles.some(i => i.name == 'unranked')) {
                    await interaction.member.roles.remove(guilddata.autoroles.filter(i => i.name != 'unranked').map(i => i.id));
                    await interaction.member.roles.add(guilddata.autoroles.find(i => i.name == 'unranked').id);
                } else await interaction.member.roles.remove(guilddata.autoroles.map(i => i.id));
                return interaction.editReply({
                    embeds: [
                        embedBuilder({
                            title: translations[guilddata.lang].mmr.no_rank_title,
                            desc: translations[guilddata.lang].mmr.no_rank_desc,
                            footer: 'VALORANT LABS [MMR ERROR]',
                        }),
                    ],
                });
            }
            const uneditableroles = [];
            roles.forEach(i => {
                if (!guilddata.autoroles.some(k => k.name == i)) return;
                const role = interaction.guild.roles.cache.get(guilddata.autoroles.find(k => k.name == i)?.id);
                if (!role?.editable)
                    uneditableroles.push({name: firstletter(i), value: role ? `<@&${role?.id}>` : translations[guilddata.lang].autorole.settings_not_set});
            });
            if (uneditableroles.length)
                return interaction.editReply({
                    embeds: [
                        embedBuilder({
                            title: translations[guilddata.lang].autorole.roles_error_title,
                            desc: translations[guilddata.lang].autorole.roles_error_desc,
                            additionalFields: uneditableroles,
                            footer: 'VALORANT LABS [ROLE PERMISSION ERROR]',
                        }),
                    ],
                });
            const removerole = guilddata.autoroles
                .filter(item => mmr.data.data.current_data.currenttierpatched.split(' ')[0].toLowerCase() != item.name)
                .map(item => {
                    return item.id;
                });
            const addrole = guilddata.autoroles.find(item => mmr.data.data.current_data.currenttierpatched.split(' ')[0].toLowerCase() == item.name)?.id;
            if (!addrole || !removerole?.length)
                return interaction.editReply({
                    embeds: [
                        embedBuilder({
                            title: translations[guilddata.lang].autorole.settings_not_set_title,
                            desc: translations[guilddata.lang].autorole.settings_not_set_desc,
                            additionalFields: [
                                {
                                    name: translations[guilddata.lang].autorole.settings_not_set_affected,
                                    value: mmr.data.data.current_data.currenttierpatched.split(' ')[0],
                                },
                            ],
                            footer: 'VALORANT LABS [AUTOROLES CONFIG ERROR]',
                        }),
                    ],
                });
            await interaction.member.roles.remove(removerole).catch(error => {
                if (error.code == 50013)
                    return interaction.editReply({
                        embeds: [
                            embedBuilder({
                                title: translations[guilddata.lang].autorole_permission_title,
                                desc: translations[guilddata.lang].autorole_permission_desc,
                                footer: 'VALORANT LABS [NO PERMISSION]',
                            }),
                        ],
                    });
            });
            await interaction.member.roles.add(addrole).catch(error => {
                if (error.code == 50013)
                    return interaction.editReply({
                        embeds: [
                            embedBuilder({
                                title: translations[guilddata.lang].autorole_permission_title,
                                desc: translations[guilddata.lang].autorole_permission_desc,
                                footer: 'VALORANT LABS [NO PERMISSION]',
                            }),
                        ],
                    });
            });
            await getDB('linkv2-logs').insertOne({
                userid: interaction.user.id,
                date: new Date(),
                admin: null,
                guild: {id: interaction.guildId, name: interaction.guild.name},
                event: 'update',
                type: 'autorole',
                rank: {
                    name: mmr.data.data.current_data.currenttierpatched.split(' ')[0],
                    id: addrole,
                },
                riotid: `${link.name}#${link.tag}`,
                rpuuid: link.link.rpuuid,
                puuid: link.link.puuid,
            });
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].autorole.role_given_title,
                        desc: translations[guilddata.lang].autorole.role_given_desc,
                    }),
                ],
            });
        }
        case 'remove': {
            const link = await getLink({user: interaction.user});
            await interaction.member.roles
                .remove(
                    guilddata.autoroles.map(item => {
                        return item.id;
                    })
                )
                .catch(error => {
                    if (error.code == 50013)
                        return interaction.editReply({
                            embeds: [
                                embedBuilder({
                                    title: translations[guilddata.lang].autorole_permission_title,
                                    desc: translations[guilddata.lang].autorole_permission_desc,
                                    footer: 'VALORANT LABS [NO PERMISSION]',
                                }),
                            ],
                        });
                });
            await getDB('linkv2-logs').insertOne({
                userid: interaction.user.id,
                date: new Date(),
                admin: null,
                guild: {id: interaction.guildId, name: interaction.guild.name},
                event: 'remove',
                type: 'autorole',
                rank: null,
                riotid: link ? `${link.name}#${link.tag}` : null,
                rpuuid: link?.link?.rpuuid ?? null,
                puuid: link?.link?.puuid ?? null,
            });
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].autorole.role_removed_title,
                        desc: translations[guilddata.lang].autorole.role_removed_desc,
                    }),
                ],
            });
        }
        case 'settings': {
            const autoroles_data = await getAutoRoles({interaction, guilddata});
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
                        title: `AutoRoles @${interaction.guild.name}`,
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
        case 'message': {
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: `AutoRoles @${interaction.guild.name}`,
                        desc: translations[guilddata.lang].autorole.message_desc,
                        footer: 'VALORANT LABS [AUTOROLES]',
                    }),
                ],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.ChannelSelect,
                                customId: `autoroles;message`,
                                maxValues: 1,
                                minValues: 1,
                                placeholder: translations[guilddata.lang].autorole.message_placeholder,
                                channelTypes: [ChannelType.GuildAnnouncement, ChannelType.GuildText],
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
        case 'overview': {
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].autorole.overview_title,
                        desc: translations[guilddata.lang].autorole.overview_desc,
                        footer: 'VALORANT LABS [AUTOROLE OVERVIEW]',
                    }),
                ],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Danger,
                                label: translations[guilddata.lang].autorole.overview_button_settings,
                                customId: `autoroles;settings`,
                            },
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Danger,
                                label: translations[guilddata.lang].autorole.overview_button_message,
                                customId: `autoroles;message`,
                            },
                        ],
                    },
                ],
            });
        }
        case 'send': {
            await interaction.client.channels.cache
                .get(args[2])
                .send({
                    embeds: [
                        embedBuilder({
                            title: 'VALORANT LABS Auto Role System',
                            desc: translations[guilddata.lang].autorole.send_desc,
                            footer: 'VALORANT LABS [AUTOROLE SYSTEM]',
                        }),
                    ],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                {
                                    type: ComponentType.Button,
                                    style: ButtonStyle.Success,
                                    customId: 'autoroles;generate',
                                    label: translations[guilddata.lang].autorole.add,
                                },
                                {
                                    type: ComponentType.Button,
                                    style: ButtonStyle.Secondary,
                                    customId: 'autoroles;update',
                                    label: translations[guilddata.lang].autorole.update,
                                },
                                {
                                    type: ComponentType.Button,
                                    style: ButtonStyle.Danger,
                                    customId: 'autoroles;remove',
                                    label: translations[guilddata.lang].autorole.remove,
                                },
                            ],
                        },
                    ],
                })
                .catch(e => {
                    return interaction.editReply({
                        embeds: [
                            embedBuilder({
                                title: translations[guilddata.lang].autorole.message_send_error_title,
                                desc: translations[guilddata.lang].autorole.message_send_error_desc,
                                footer: 'VALORANT LABS [ROLE PERMISSION ERROR]',
                            }),
                        ],
                        components: [
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
                    });
                });
            return interaction.editReply({
                embeds: [
                    embedBuilder({
                        title: translations[guilddata.lang].autorole.created_title,
                        desc: translations[guilddata.lang].autorole.created_desc,
                        footer: 'VALORANT LABS [AUTOROLE CREATED]',
                    }),
                ],
                components: [
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
            });
        }
    }
}
export const name = 'autoroles';
