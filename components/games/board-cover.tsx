import React from 'react';
import { View } from 'react-native';
import { CheckerPiece, ChessPiece } from './board-ui';

export function BoardCover({ kind }: { kind: 'checkers' | 'chess' }) {
  return <View accessible={false} style={{ width: '100%', aspectRatio: 1, backgroundColor: kind === 'checkers' ? '#284e40' : '#303b4b', alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: '76%', aspectRatio: 1, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 4, borderColor: '#ffffff30', borderRadius: 9, overflow: 'hidden', transform: [{ rotate: '-8deg' }] }}>
      {Array.from({ length: 16 }, (_, i) => <View key={i} style={{ width: '25%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: (Math.floor(i / 4) + i % 4) % 2 ? '#739080' : '#efe7d5' }}>
        {kind === 'checkers' && [1, 3, 12, 14, 9].includes(i) ? <CheckerPiece red={i > 7} king={i === 9} size={29} /> : null}
        {kind === 'chess' && [1, 6, 12, 14].includes(i) ? <ChessPiece type={i === 1 ? 'k' : i === 12 ? 'n' : i === 14 ? 'q' : 'p'} white={i > 7} size={32} /> : null}
      </View>)}
    </View>
  </View>;
}
