import * as React from 'react';
import { render } from 'react-dom';
import * as _ from 'lodash';

import { MultiTimeVis, TimeChannel } from '@otosense/multi-time-vis';

const DFLT_CHK_SIZE_MCS: number = 975238;
import { bytesToMcs, DFLT_SR, generateWAVHeader } from '@otosense/sound-utils';

export function renderTimeChannel(
  element: HTMLElement,
  channel: any,
  props: any
): void {
  console.log('loaded OtoSense time visualization v0.2.2');
  const { enable_playback, height, params, title, subtitle } = props;
  if (props.bt && !channel.bt) {
    channel.bt = props.bt;
  }
  if (props.tt && !channel.tt) {
    channel.tt = props.tt;
  }
  const chart_type: string = props.chart_type || channel.chart_type;
  const preprocessedChannel: any = preprocessChannel(channel);
  const chartParams: any = params ? params : {};
  render(
    <TimeChannel
      channel={preprocessedChannel}
      from={preprocessedChannel.bt}
      to={preprocessedChannel.tt}
      chartType={chart_type}
      enablePlayback={enable_playback}
      height={height}
      params={chartParams}
      title={title}
      subtitle={subtitle}
      suppressPlayOnSpace
    />, element);
}

const makeSelectHandler = (pythonName: string) => (startRatio: number, endRatio: number) => {
  const pythonStatement = `${pythonName}(${startRatio}, ${endRatio})`;
  console.log({ pythonStatement });
  console.log({ jupyter: window['Jupyter'].notebook.kernel.execute(pythonStatement) })
}

export function renderMultiTimeVis(
    element: HTMLElement,
    channels: any[],
    props: any,
    callback: string,
): void {
  console.log('multi time vis v0.3.0', { props, channels, callback });
  const preprocessedChannels: any[] = channels.map(preprocessChannel);
  const bt: number = props.bt || _.minBy(preprocessedChannels, 'bt').bt || 0;
  const tt: number = props.tt || _.maxBy(preprocessedChannels, 'tt').tt || 10000000;
  const handleSelect = callback ? makeSelectHandler(callback) : () => null;
  render(
    <MultiTimeVis
      allowEvents
      channels={preprocessedChannels}
      from={bt}
      leftX={0}
      onSelect={(a, b) => {
        console.log({ a, b });
        handleSelect(a, b);
      }}
      params={props.params || {}}
      rightX={1}
      to={tt}
      hideTimeScale
    />, element);
}

function preprocessChannel(channel: any): any {
  if (channel.type === 'audio') {
    return preprocessAudioChannel(channel);
  } else {
    return preprocessDataChannel(channel);
  }
}

function preprocessAudioChannel(channel: any): any {
  const outputChannel: any = _.cloneDeep(channel);
  const sr: number = outputChannel.sr || DFLT_SR;
  if (!outputChannel.bt) {
    outputChannel.bt = 0;
  }
  if (outputChannel.wf) {
    const dataLength: number = outputChannel.wf.length * 2;
    outputChannel.tt = outputChannel.tt || outputChannel.bt + Math.floor((outputChannel.wf.length / sr) * 1000000);
    const header: Uint8Array = generateWAVHeader(sr, 16, dataLength);
    const resultBuffer: ArrayBuffer = new ArrayBuffer(dataLength + 44);
    const resultUint8View: Uint8Array = new Uint8Array(resultBuffer);
    resultUint8View.set(header);
    const resultInt16View: Int16Array = new Int16Array(resultBuffer, 44);
    resultInt16View.set(outputChannel.wf);
    outputChannel.buffer = resultBuffer;
  } else if (outputChannel.buffer) {
    outputChannel.buffer = new Int16Array(outputChannel.buffer).buffer;
  }
  if (!outputChannel.tt && outputChannel.buffer) {
    const duration: number = bytesToMcs(outputChannel.buffer.byteLength, 16, sr);
    outputChannel.tt = outputChannel.bt + duration;
  }
  return outputChannel;
}

function preprocessDataChannel(channel: any): any {
  let outputChannel: any = channel;
  if (Array.isArray(channel)) {
    outputChannel = {
      data: channel,
      type: 'data',
    };
  }
  if (!outputChannel.data || !outputChannel.data.length) {
    outputChannel.data = [];
    return outputChannel;
  }
  let currentTime: number = outputChannel.bt || 0;
  outputChannel.bt = currentTime;
  const chunkSize: number = outputChannel.chunkSizeMcs || DFLT_CHK_SIZE_MCS;
  outputChannel.chunkSize = chunkSize;
  const dataPoint: any = outputChannel.data[0];
  if (typeof dataPoint === 'number') {
    outputChannel.data = _.map(outputChannel.data, (value: number) => {
     const output: any = {
       time: currentTime,
       value,
     };
     currentTime += chunkSize;
     return output;
    });
  } else if (typeof dataPoint === 'string') {
    outputChannel.data = _.map(outputChannel.data, (winner: string) => {
     const output: any = {
       time: currentTime,
       winner,
     };
     currentTime += chunkSize;
     return output;
    });
  } else if (_.has(dataPoint, 'currentTime')) {
    return;
  } else {
    const key: string = _.has(dataPoint, 'value') ? 'value' : _.keys(dataPoint)[0];
    outputChannel.data = _.map(outputChannel.data, (item: any) => {
     const output: any = {
       time: currentTime,
       value: item[key],
     };
     currentTime += chunkSize;
     return output;
    });
  }
  const tt = outputChannel.tt || currentTime;
  outputChannel.tt = tt;
  return outputChannel;
}
