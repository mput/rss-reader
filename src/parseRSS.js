import { uniqueId } from 'lodash';

const channnelProps = ['title', 'link', 'description'];
const itemProps = ['title', 'link', 'description'];

const parseNode = (node, props, idPrefix) => {
  const initial = { id: uniqueId(`${idPrefix}_`) };
  return props.reduce((acc, prop) => {
    const element = node.querySelector(prop);
    if (element) {
      return { ...acc, [prop]: element.textContent };
    }
    return acc;
  }, initial);
};

export default (data) => {
  const parser = new DOMParser();
  const feedDOM = parser.parseFromString(data, 'application/xml');
  const channelNode = feedDOM.querySelector('channel');
  const itemsNodes = feedDOM.getElementsByTagName('item');
  const feed = parseNode(channelNode, channnelProps, 'feed');
  feed.items = [...itemsNodes].map(node => parseNode(node, itemProps, 'item'));
  return feed;
};
