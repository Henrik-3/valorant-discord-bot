import {getDB, moment, axios, getTranslations, sleep, hdevtoken} from '../methods.js';
export const fetchWebsite = async function (manager) {
    const translations = getTranslations();
    const types = ['patchnotes', 'othernews', 'maintenance', 'incidents'];
    const ccodes = ['de', 'en-us', 'en-gb', 'jp', 'pt-br', 'fr', 'es', 'vi', 'pl', 'it', 'tr'];
    const nstatus = ['news', 'onews', 'serverstatus', 'serverstatus'];
    for (let i = 0; types.length > i; i++) {
        if (i == 0 || i == 1) {
            for (let k = 0; ccodes.length > k; k++) {
                const website = await axios.get(i == 0 ? translations[ccodes[k]].patchurl : translations[ccodes[k]].websiteurl, {headers: {Authorization: hdevtoken}}).catch(error => {
                    return error;
                });
                if (!website.response && !website.code) {
                    const db = await getDB('websitecheck').findOne({code: ccodes[k]});
                    let article =
                        i == 0
                            ? website.data.data.filter(item => moment(item.date).unix() > db.patchnotes)
                            : website.data.data.filter(item => moment(item.date).unix() > db.datewebsite && item.category != 'patch_notes');
                    console.log(article, db);
                    if (article.length) {
                        getDB('websitecheck').updateOne(
                            {code: ccodes[k]},
                            {$set: i == 0 ? {patchnotes: moment(article[0].date).unix()} : {datewebsite: moment(article[0].date).unix()}}
                        );
                        let fetch = await getDB('settings')
                            .find({lang: ccodes[k]}, i == 0 ? {gid: 1, lang: 1, news: 1} : {gid: 1, lang: 1, onews: 1})
                            .toArray();
                        for (let o = 0; article.length > o; o++) {
                            for (let f = 0; fetch.length > f; f++) {
                                if (fetch[f][nstatus[i]]) {
                                    const gcheck = await manager.broadcastEval(
                                        (client, {channelid}) => {
                                            try {
                                                return client.channels.cache.has(channelid);
                                            } catch (e) {}
                                        },
                                        {context: {channelid: fetch[f][nstatus[i]].replace(/[^0-9]/g, '')}}
                                    );
                                    if (gcheck.some(item => item == true)) {
                                        await manager.broadcastEval(
                                            (client, {channelid, title, external_link, url, banner_url}) => {
                                                try {
                                                    if (client.channels.cache.has(channelid)) {
                                                        const channel = client.channels.cache.get(channelid);
                                                        if (channel.type == 15 && !channel.flags.has(16)) {
                                                            channel.threads.create({
                                                                name: title,
                                                                message: {
                                                                    embeds: [
                                                                        {
                                                                            color: 0xff4654,
                                                                            title: title,
                                                                            url: external_link != null ? external_link : url,
                                                                            image: {
                                                                                url: banner_url,
                                                                            },
                                                                            footer: {
                                                                                text: 'VALORANT LABS [AUTONEWS WEBSITE]',
                                                                                icon_url: 'https://valorantlabs.xyz/css/valorant-logo.png',
                                                                            },
                                                                        },
                                                                    ],
                                                                    components: [
                                                                        {
                                                                            type: 1,
                                                                            components: [
                                                                                {
                                                                                    type: 2,
                                                                                    style: 5,
                                                                                    url: external_link != null ? external_link : url,
                                                                                    label: title,
                                                                                },
                                                                            ],
                                                                        },
                                                                    ],
                                                                },
                                                            });
                                                        } else {
                                                            channel
                                                                .send({
                                                                    embeds: [
                                                                        {
                                                                            color: 0xff4654,
                                                                            title: title,
                                                                            url: external_link != null ? external_link : url,
                                                                            image: {
                                                                                url: banner_url,
                                                                            },
                                                                            footer: {
                                                                                text: 'VALORANT LABS [AUTONEWS WEBSITE]',
                                                                                icon_url: 'https://valorantlabs.xyz/css/valorant-logo.png',
                                                                            },
                                                                        },
                                                                    ],
                                                                    components: [
                                                                        {
                                                                            type: 1,
                                                                            components: [
                                                                                {
                                                                                    type: 2,
                                                                                    style: 5,
                                                                                    url: external_link != null ? external_link : url,
                                                                                    label: title,
                                                                                },
                                                                            ],
                                                                        },
                                                                    ],
                                                                })
                                                                .catch(error => error);
                                                        }
                                                    }
                                                } catch (e) {}
                                            },
                                            {
                                                context: {
                                                    channelid: fetch[f][nstatus[i]].replace(/[^0-9]/g, ''),
                                                    title: article[o].title,
                                                    external_link: article[o].external_link,
                                                    url: article[o].url,
                                                    banner_url: article[o].banner_url,
                                                },
                                            }
                                        );
                                        await sleep(1000);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (i == 2 || i == 3) {
            for (let k = 0; ccodes.length > k; k++) {
                const website = await axios.get(translations[ccodes[k]].statusurl, {headers: {Authorization: hdevtoken}}).catch(error => {
                    return error;
                });
                if (!website.response) {
                    if (i == 2 ? website.data.data.maintenances.length : website.data.data.incidents.length) {
                        let article = i == 2 ? website.data.data.maintenances[0] : website.data.data.incidents[0];
                        article.updates[0].created_at = Date.parse(article.updates[0].created_at);
                        const db = await getDB('websitecheck').findOne({code: ccodes[k]});
                        if (
                            i == 2
                                ? moment(article.updates[0].created_at).unix() > db.datestatusmaintenance
                                : moment(article.updates[0].created_at).unix() > db.datestatusincidents
                        ) {
                            i == 2
                                ? getDB('websitecheck').updateOne({code: ccodes[k]}, {$set: {datestatusmaintenance: moment(article.updates[0].created_at).unix()}})
                                : getDB('websitecheck').updateOne({code: ccodes[k]}, {$set: {datestatusincidents: moment(article.updates[0].created_at).unix()}});
                            const fetch = await getDB('settings').find({lang: ccodes[k]}, {gid: 1, lang: 1, serverstatus: 1}).toArray();
                            for (let f = 0; fetch.length > f; f++) {
                                if (fetch[f].serverstatus) {
                                    const gcheck = await manager.broadcastEval(
                                        (client, {channelid}) => {
                                            try {
                                                return client.channels.cache.has(channelid);
                                            } catch (e) {}
                                        },
                                        {context: {channelid: fetch[f].serverstatus.replace(/[^0-9]/g, '')}}
                                    );
                                    if (gcheck.some(item => item == true)) {
                                        await manager.broadcastEval(
                                            (client, {channelid, desc, t, create, platform, postedat, platforms}) => {
                                                try {
                                                    if (client.channels.cache.has(channelid)) {
                                                        const channel = client.channels.cache.get(channelid);
                                                        if (channel.type == 15 && !channel.flags.has(16)) {
                                                            channel.threads.create({
                                                                name: t,
                                                                message: {
                                                                    embeds: [
                                                                        {
                                                                            title: t,
                                                                            color: 0xff4654,
                                                                            description: desc,
                                                                            fields: [
                                                                                {name: postedat, value: create, inline: true},
                                                                                {name: platforms, value: platform, inline: true},
                                                                            ],
                                                                            timestamp: new Date().toISOString(),
                                                                            footer: {
                                                                                text: 'VALORANT LABS [STATUS UPDATE]',
                                                                                icon_url: 'https://valorantlabs.xyz/css/valorant-logo.png',
                                                                            },
                                                                        },
                                                                    ],
                                                                },
                                                            });
                                                        } else {
                                                            channel
                                                                .send({
                                                                    embeds: [
                                                                        {
                                                                            title: t,
                                                                            color: 0xff4654,
                                                                            description: desc,
                                                                            fields: [
                                                                                {name: postedat, value: create, inline: true},
                                                                                {name: platforms, value: platform, inline: true},
                                                                            ],
                                                                            timestamp: new Date().toISOString(),
                                                                            footer: {
                                                                                text: 'VALORANT LABS [STATUS UPDATE]',
                                                                                icon_url: 'https://valorantlabs.xyz/css/valorant-logo.png',
                                                                            },
                                                                        },
                                                                    ],
                                                                })
                                                                .catch(error => error);
                                                        }
                                                    }
                                                } catch (e) {}
                                            },
                                            {
                                                context: {
                                                    channelid: fetch[f].serverstatus.replace(/[^0-9]/g, ''),
                                                    desc:
                                                        article.updates[0].translations.find(c => c.locale == translations[ccodes[k]].locale).content != undefined
                                                            ? article.updates[0].translations.find(c => c.locale == translations[ccodes[k]].locale).content
                                                            : article.updates[0].translations.find(c => c.locale == 'en_US').content,
                                                    t:
                                                        article.titles.find(c => c.locale == translations[ccodes[k]].locale).content != undefined
                                                            ? article.titles.find(c => c.locale == translations[ccodes[k]].locale).content
                                                            : article.titles.find(c => c.locale == 'en_US').content,
                                                    create: moment(article.created_at).format('LLLL'),
                                                    platform: article.platforms[0],
                                                    postedat: translations[fetch[f].lang].status.postedat,
                                                    platforms: translations[fetch[f].lang].status.platforms,
                                                },
                                            }
                                        );
                                        await sleep(1000);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
