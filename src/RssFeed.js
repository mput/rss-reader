import axios from 'axios';

const channnelProps = ['title', 'link', 'description'];
const itemProps = ['title', 'link', 'description'];

const getRssString = async (url) => {
  const { data } = await axios.get(url);
  return data;
};

const parseNode = (node, props) => props
  .reduce((acc, prop) => {
    const element = node.querySelector(prop);
    if (element) {
      return { ...acc, [prop]: element.textContent };
    }
    return acc;
  }, {});

export default class RssFeed {
  constructor(url) {
    this.url = url;
  }

  async update() {
    const proxiedFeedUrl = `https://cors-anywhere.herokuapp.com/${this.url}`;
    const rawRSS = await getRssString(proxiedFeedUrl);
    if (!this.rawRSS || this.rawRSS !== rawRSS) {
      this.rawRSS = rawRSS;
      this.parse();
      return true;
    }
    return false;
  }

  parse() {
    const parser = new DOMParser();
    const feedDOM = parser.parseFromString(this.rawRSS, 'application/xml');
    const channelNode = feedDOM.querySelector('channel');
    const itemsNodes = feedDOM.getElementsByTagName('item');
    this.channel = parseNode(channelNode, channnelProps);
    this.items = [...itemsNodes].map(node => parseNode(node, itemProps));
  }
}
