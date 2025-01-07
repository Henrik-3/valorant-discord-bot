import {
    embedBuilder,
    getTranslations,
    getCustomBackground,
    AttachmentBuilder,
    getDB,
    axios,
    getFunction,
    hdevtoken
} from '../../methods.js';

export async function execute({interaction, args, guilddata} = {}) {
    await interaction.deferUpdate();
    const translations = getTranslations();
    const buildBackground = getFunction('buildBackground');
    const buildMMRImage = getFunction('buildMMRImage');
    const errorhandlerinteraction = getFunction('errorhandlerinteraction');
    const components = [...interaction.message.components];
    interaction.editReply({
        embeds: [
            embedBuilder({
                title: translations[guilddata.lang].mmr.loading_title,
                desc: translations[guilddata.lang].mmr.loading_desc,
                footer: 'VALORANT LABS [MMR LOADING]',
            }),
        ],
        attachments: [],
        components: [],
    });
    const bgcanvas = guilddata.background_mmr ? await buildBackground(getCustomBackground(guilddata.background_mmr), 'game') : null;
    console.log(args);
    const mmrdb = await getDB('mmr').findOne({puuid: args[2]});
    const mmr = mmrdb
        ? mmrdb
        : await axios.get(`https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/${args[1]}/${args[2]}`, {headers: {Authorization: hdevtoken}}).catch(error => {
              return error;
          });
    if (mmr.response) return errorhandlerinteraction({interaction, status: mmr.response.status, type: 'stats', lang: guilddata.lang, data: mmr.response.data});
    const image = await buildMMRImage({mmrdata: mmr.data.data, seasonid: interaction.values[0], guilddata, bgcanvas});
    return interaction.editReply({files: image && image instanceof AttachmentBuilder ? [image] : [], embeds: [], components: components});
}
export const name = 'mmr';
