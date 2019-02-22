const channnelProps = ['title', 'link', 'description'];
const itemProps = ['title', 'link', 'description', 'guid'];

const parseNode = (node, props) => props.reduce((acc, prop) => {
  const element = node.querySelector(prop);
  if (element) {
    return { ...acc, [prop]: element.textContent };
  }
  return acc;
}, {});

export default (data) => {
  const parser = new DOMParser();
  const feedDOM = parser.parseFromString(data, 'application/xml');
  const itemsNodes = feedDOM.getElementsByTagName('item');
  const channelNode = feedDOM.querySelector('channel');
  const channel = parseNode(channelNode, channnelProps);
  const items = [...itemsNodes].map(node => parseNode(node, itemProps));
  return { channel, items };
};
