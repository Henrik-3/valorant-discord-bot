import {
    axios,
    clusters,
    moment,
    getTranslations,
    embedBuilder,
    ComponentType,
    ButtonStyle,
    getFunction,
    hdevtoken
} from '../../methods.js';

export async function execute({interaction, guilddata} = {}) {
    const translations = getTranslations();
    const errorhandlerinteraction = getFunction('errorhandlerinteraction');
    const embeds = [];
    const status = await axios.get(clusters[interaction.options.get('region').value].status, {headers: {Authorization: hdevtoken}}).catch(error => {
        return error;
    });
    if (status.response) return errorhandlerinteraction({interaction, status: status.response.status, lang: guilddata.lang, data: status.response.data});
    const maintainance = status.data.data.maintenances;
    const incidents = status.data.data.incidents;
    if (!maintainance.length && !incidents.length)
        return interaction.editReply({embeds: [embedBuilder({title: translations[guilddata.lang].status.noerrors, footer: 'VALORANT LABS [STATUS NOERROR]'})]});
    moment.locale(translations[guilddata.lang].moment);
    for (let i = 0; maintainance.length > i; i++) {
        embeds.push(
            embedBuilder({
                title: maintainance[i].titles.find(item => item.locale == translations[guilddata.lang].locale)
                    ? maintainance[i].titles.find(item => item.locale == translations[guilddata.lang].locale).content
                    : maintainance[i].titles.find(item => item.locale == 'en_US').content,
                desc: maintainance[i].updates[0].translations.find(item => item.locale == translations[guilddata.lang].locale)
                    ? maintainance[i].updates[0].translations.find(item => item.locale == translations[guilddata.lang].locale).content
                    : maintainance[i].updates[0].translations.find(item => item.locale == 'en_US').content,
                additionalFields: [
                    {name: translations[guilddata.lang].status.postedat, value: moment(maintainance[i].created_at).format('LLLL'), inline: true},
                    {name: translations[guilddata.lang].status.platforms, value: maintainance[i].platforms.join(' | '), inline: true},
                    {name: translations[guilddata.lang].status.type, value: maintainance[i].incident_severity ? maintainance[i].incident_severity : 'N.A', inline: true},
                ],
                footer: 'VALORANT LABS [STATUS MAINTENANCE]',
            })
        );
    }
    for (let i = 0; incidents.length > i; i++) {
        embeds.push(
            embedBuilder({
                title: incidents[i].titles.find(item => item.locale == translations[guilddata.lang].locale)
                    ? incidents[i].titles.find(item => item.locale == translations[guilddata.lang].locale).content
                    : incidents[i].titles.find(item => item.locale == 'en_US').content,
                desc: incidents[i].updates[0].translations.find(item => item.locale == translations[guilddata.lang].locale)
                    ? incidents[i].updates[0].translations.find(item => item.locale == translations[guilddata.lang].locale).content
                    : incidents[i].updates[0].translations.find(item => item.locale == 'en_US').content,
                additionalFields: [
                    {name: translations[guilddata.lang].status.postedat, value: moment(incidents[i].created_at).format('LLLL'), inline: true},
                    {name: translations[guilddata.lang].status.platforms, value: incidents[i].platforms.join(' | '), inline: true},
                    {name: translations[guilddata.lang].status.type, value: incidents[i].incident_severity ? incidents[i].incident_severity : 'N.A', inline: true},
                ],
                footer: 'VALORANT LABS [STATUS INCIDENT]',
            })
        );
    }
    return interaction.editReply({
        embeds: embeds,
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Link,
                        url: clusters[interaction.options.get('region').value].page,
                        label: translations[guilddata.lang].support,
                    },
                ],
            },
        ],
    });
}
export const name = 'status';
