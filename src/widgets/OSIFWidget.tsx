import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface WidgetContactItem {
  id: string;
  name: string;
  days: number;
  age?: number | null;
  giftStatus?: string;
  buyGift?: number;
}

export interface OSIFWidgetProps {
  contacts: WidgetContactItem[];
}

export const OSIFWidget: React.FC<OSIFWidgetProps> = ({ contacts }) => {
  const topContacts = contacts.slice(0, 3);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#F2ECE1',
        borderRadius: 16,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Başlık Alanı */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <TextWidget
          text="OSIF"
          style={{
            fontSize: 13,
            fontWeight: 'bold',
            color: '#9E3A20',
          }}
        />
        <TextWidget
          text="Hızlı Bakış"
          style={{
            fontSize: 11,
            color: '#78716C',
          }}
        />
      </FlexWidget>

      {/* Kişiler Listesi */}
      {topContacts.length === 0 ? (
        <FlexWidget
          style={{
            flex: 1,
            width: 'match_parent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Yaklaşan özel gün yok"
            style={{
              fontSize: 12,
              color: '#78716C',
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            flex: 1,
            width: 'match_parent',
            flexDirection: 'column',
            justifyContent: 'space-around',
          }}
        >
          {topContacts.map((c) => {
            const daysText = c.days === 0 ? 'Bugün!' : `${c.days} gün`;
            const showGift = (c.buyGift ?? 1) === 1;
            const statusText = showGift
              ? c.giftStatus === 'ready'
                ? 'Hediye: Hazır'
                : c.giftStatus === 'bought'
                ? 'Hediye: Alındı'
                : c.giftStatus === 'thinking'
                ? 'Hediye: Düşünülüyor'
                : 'Hediye: Düşünülüyor'
              : (c.age ? `${c.age}. yaş` : 'Doğum günü');

            return (
              <FlexWidget
                key={c.id}
                style={{
                  width: 'match_parent',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 3,
                }}
              >
                <FlexWidget
                  style={{
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <TextWidget
                    text={c.name}
                    style={{
                      fontSize: 13,
                      fontWeight: 'bold',
                      color: '#1E1B17',
                    }}
                  />
                  <TextWidget
                    text={statusText}
                    style={{
                      fontSize: 10,
                      color: '#78716C',
                    }}
                  />
                </FlexWidget>

                <FlexWidget
                  style={{
                    backgroundColor: c.days === 0 ? '#9E3A20' : '#E7DFD3',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TextWidget
                    text={daysText}
                    style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: c.days === 0 ? '#FFFFFF' : '#1E1B17',
                    }}
                  />
                </FlexWidget>
              </FlexWidget>
            );
          })}
        </FlexWidget>
      )}
    </FlexWidget>
  );
};
