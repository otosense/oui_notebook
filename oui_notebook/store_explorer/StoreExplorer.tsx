import React, { useState } from 'react';

interface IProps {
  meta: any;
  rootKeys: string[];
  rootVarName: string;
}

const selectedStyle = { background: '#d1d1d1' }

const StoreExplorer = ({ meta, rootKeys, rootVarName }: IProps) => {
  const [children, setChildren] = useState([]);
  const [childrenPath, setChildrenPath] = useState([]);
  const [isLeaf, setIsLeaf] = useState(false);

  const receiveChild = (depth: number, key: string, newChild: any) => {
    console.log({ depth, key, newChild });
    if (!newChild) {
      return;
    }
    const newChildren = children.slice(0, depth);
    const newChildrenPath = childrenPath.slice(0, depth);
    if (newChild.isLeaf) {
      setIsLeaf(true);
    } else {
      setIsLeaf(false);
    }
    newChildren.push(newChild);
    newChildrenPath.push(key);
    setChildren(newChildren);
    setChildrenPath(newChildrenPath);
  };

  const expandChild = (depth: number, key: string) => {
    let accessPath = '';
    if (depth) {
      for (let i = 0; i < depth; i++) {
        accessPath += `['${childrenPath[i]}']`;
      }
    }
    accessPath += `['${key}']`;
    window['otosense']['childIsReady'] = (newChild) => {
      console.log({ newChild });
      receiveChild(depth, key, newChild);
    }
    const pythonStatement = `load_store_child("${rootVarName}", "${accessPath}")`;
    console.log({ pythonStatement });
    console.log({ jupyter: window['Jupyter'].notebook.kernel.execute(pythonStatement) });
  }

  const renderLeaf = () => {
    return <div>Leaf node (cannot render)</div>;
  }

  return (
    <div style={{ display: 'flex' }}>
      <div style={{}}>
        <header>{JSON.stringify(meta)}</header>
        <div>varname: {rootVarName}</div>
        <div>
          {rootKeys.map((key: string) => (
            <div
              key={key}
              style={childrenPath.length && key === childrenPath[0] ? selectedStyle : {}}
              onClick={() => expandChild(0, key)}
            >{key}
            </div>
          ))}
        </div>
      </div>
      <>
        {childrenPath.map((childKey: string, depth: number) => {
          if (depth < childrenPath.length - 1 || !isLeaf) {
            return (
              <div style={{ marginLeft: 10 }}>
                <div>{JSON.stringify(children[depth]?.meta || {})}</div>
                <div>
                  {children[depth] ? children[depth].keys.map((key: string) => (
                    <div
                      key={key}
                      onClick={() => expandChild(depth + 1, key)}
                      style={key === childrenPath[depth + 1] ? selectedStyle : {}}
                    >{key}
                    </div>
                  )) : <div>Missing expected child node.</div>}
                </div>
              </div>
            );
          }
          return renderLeaf();
        })}
      </>
    </div>
  );
};

export default StoreExplorer;
