const channnelProps = ['title', 'link', 'description'];
const itemProps = ['title', 'link', 'description', 'guid'];

const parseNode = (node, props) => props.reduce((acc, prop) => {
  const element = node.querySelector(prop);
  if (element) {
    return { ...acc, [prop]: element.textContent };
  }
  return acc;
}, {});

const parseChannel = (data) => {
  const parser = new DOMParser();
  const feedDOM = parser.parseFromString(data, 'application/xml');
  const channelNode = feedDOM.querySelector('channel');
  const feed = parseNode(channelNode, channnelProps);
  return feed;
};

const parseItems = (data) => {
  const parser = new DOMParser();
  const feedDOM = parser.parseFromString(data, 'application/xml');
  const itemsNodes = feedDOM.getElementsByTagName('item');
  const items = [...itemsNodes].map(node => parseNode(node, itemProps));
  return items;
};

export { parseChannel, parseItems };
